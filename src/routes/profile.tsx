import { createFileRoute } from "@tanstack/react-router";
import { createPlayerProfile, getPlayerProfile } from "../lib/player-profile/server";
import { PILOT_ICONS, getStarterIcons, type PilotIconId } from "../lib/player-profile/types";

export const Route = createFileRoute("/profile")({
  component: PlayerProfile,
  loader: async ({ context }) => {
    const playerId = context?.playerId || "00000000-0000-0000-0000-000000000001";
    const profile = await getPlayerProfile(playerId);
    return { playerId, profile };
  },
});

function PlayerProfile() {
  const { playerId, profile } = Route.useLoaderData();
  const [isEditing, setIsEditing] = useState(!profile);
  const [selectedIcon, setSelectedIcon] = useState<PilotIconId>(
    profile?.iconId || "pilot-01"
  );
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [callSign, setCallSign] = useState(profile?.callSign || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const starterIcons = getStarterIcons();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await createPlayerProfile(playerId, {
        displayName,
        callSign,
        iconId: selectedIcon,
      });
      
      // Refresh the page to show updated profile
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
      setIsSaving(false);
    }
  };

  if (!isEditing && profile) {
    // View mode
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Pilot Profile</h1>
          
          <div className="bg-gray-800 rounded-lg p-8">
            <div className="flex items-center gap-6 mb-8">
              <div className="text-8xl">{PILOT_ICONS.find(i => i.id === profile.iconId)?.svg}</div>
              <div>
                <h2 className="text-3xl font-bold">{profile.displayName}</h2>
                <p className="text-xl text-blue-400">"{profile.callSign}"</p>
                <p className="text-gray-400 mt-2">Rank {profile.currentRank}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-900 p-4 rounded">
                <div className="text-3xl font-bold text-green-400">
                  {profile.credits?.toLocaleString?.() ?? "0"}
                </div>
                <div className="text-sm text-gray-400">Credits</div>
              </div>
              <div className="bg-gray-900 p-4 rounded">
                <div className="text-3xl font-bold text-purple-400">
                  {profile.totalXp?.toLocaleString?.() ?? "0"}
                </div>
                <div className="text-sm text-gray-400">Total XP</div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Edit/Create mode
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          {profile ? "Edit Profile" : "Create Pilot Profile"}
        </h1>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8">
          {error && (
            <div className="bg-red-900 border border-red-500 text-red-200 p-4 rounded mb-6">
              {error}
            </div>
          )}

          {/* Icon Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Select Pilot Icon</label>
            <div className="grid grid-cols-4 gap-3">
              {starterIcons.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => setSelectedIcon(icon.id)}
                  className={`p-4 rounded-lg text-4xl transition ${
                    selectedIcon === icon.id
                      ? "bg-blue-600 ring-2 ring-blue-400"
                      : "bg-gray-900 hover:bg-gray-700"
                  }`}
                >
                  {icon.svg}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              More icons unlock as you rank up!
            </p>
          </div>

          {/* Display Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>

          {/* Call Sign */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Call Sign
            </label>
            <input
              type="text"
              value={callSign}
              onChange={(e) => setCallSign(e.target.value)}
              maxLength={20}
              minLength={3}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., MAVERICK, GOOSE, ICEMAN"
            />
            <p className="text-sm text-gray-400 mt-1">
              Your pilot callsign (3-20 characters)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg transition"
            >
              {isSaving ? "Saving..." : profile ? "Save Changes" : "Create Profile"}
            </button>
            
            {profile && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
