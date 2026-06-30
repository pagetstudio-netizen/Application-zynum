import noDataImg from "@assets/nodata-be77d330_1782822674159.png";

interface NoDataProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function NoData({ title, description, action }: NoDataProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
      <img
        src={noDataImg}
        alt="Aucune donnée"
        className="w-40 h-auto mb-4 opacity-90"
        draggable={false}
      />
      {title && (
        <h3 className="font-extrabold text-gray-800 text-base mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-gray-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
