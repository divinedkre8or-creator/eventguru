import { useLocation } from "react-router-dom";

const Placeholder = () => {
  const location = useLocation();
  const pageName = location.pathname.split("/").pop() || "Page";

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-4">
        <span className="text-ivory/30 text-xl">🚧</span>
      </div>
      <h2 className="font-heading text-lg font-700 text-ivory capitalize">{pageName}</h2>
      <p className="text-ivory/40 text-xs font-body mt-1">Coming soon</p>
    </div>
  );
};

export default Placeholder;
