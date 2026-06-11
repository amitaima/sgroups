import "./AiLoader.scss";

interface AiLoaderProps {
  text?: string;
}

export const AiLoader = ({ text = "חושב..." }: AiLoaderProps) => (
  <div className="ai-loader">
    <div className="ai-loader__dots">
      <span />
      <span />
      <span />
    </div>
    <span className="ai-loader__text">{text}</span>
  </div>
);
