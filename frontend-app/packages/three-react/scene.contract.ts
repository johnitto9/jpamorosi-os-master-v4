export type SceneProps = {
  density?: number;   // 200–5000
  color?: string;     // CSS color (hsl/oklch/hex)
  speed?: number;     // 0.0–1.0
  className?: string;
};

export interface SceneContract {
  (props: SceneProps): JSX.Element;
}