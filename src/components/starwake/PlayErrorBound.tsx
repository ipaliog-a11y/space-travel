import { Component, type ErrorInfo, type ReactNode } from "react";
import { recoverPlay } from "@/lib/starwake/recover";

type Props = { children: ReactNode };
type State = { err: string | null; gen: number };

export class PlayErrorBound extends Component<Props, State> {
  state: State = { err: null, gen: 0 };

  static getDerivedStateFromError(err: Error): Partial<State> {
    return { err: err.message || "The bay dropped." };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(err, info.componentStack);
  }

  onPad = () => {
    recoverPlay();
    this.setState((s) => ({ err: null, gen: s.gen + 1 }));
  };

  render() {
    if (this.state.err) {
      return (
        <div className="gate hangar helion-dock" data-ui>
          <div className="k">Gate</div>
          <h1>Bay dropped</h1>
          <p className="lede">{this.state.err}</p>
          <div className="gate-acts">
            <button type="button" className="engage" onClick={this.onPad}>
              Pad
            </button>
          </div>
        </div>
      );
    }
    return <div key={this.state.gen}>{this.props.children}</div>;
  }
}
