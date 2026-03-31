import { useLocation } from "react-router-dom";

const Placeholder = () => {
  const location = useLocation();
  const pageName = location.pathname.split("/").pop() || "Page";

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4">
        <span className="text-muted-foreground text-xl">🚧</span>
      </div>
      <h2 className="font-heading text-lg font-bold text-foreground capitalize">{pageName}</h2>
      <p className="text-muted-foreground text-sm font-medium mt-1">Coming soon</p>
    </div>
  );
};

export default Placeholder;
