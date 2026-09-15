import Link from "next/link";
import type { AdminVehicle } from "@/lib/vehicles";
export default function VehicleActions({ vehicle }: { vehicle: AdminVehicle }) {
  const publicView =
    vehicle.PUBLIC_YN === "Y" && vehicle.VEHICLE_STATUS === "AVAILABLE";
  return (
    <div
      className="adm-row-actions"
      role="group"
      aria-label={`Actions for stock ${vehicle.STOCK_NUMBER || vehicle.VEHICLE_ID}`}
    >
      {publicView ? (
        <Link
          href={`/vehicle/${vehicle.VEHICLE_ID}`}
          className="adm-btn adm-btn-ghost adm-btn-sm"
        >
          VIEW
        </Link>
      ) : (
        <span
          className="adm-btn adm-btn-ghost adm-btn-sm dh-disabled"
          aria-disabled="true"
          title="Public view is available for published, available vehicles"
        >
          VIEW
        </span>
      )}
      <Link
        href={`/admin/inventory/${vehicle.VEHICLE_ID}/edit`}
        className="adm-btn adm-btn-secondary adm-btn-sm"
      >
        EDIT
      </Link>
      <Link
        href={`/admin/inventory/photos?vehicleId=${vehicle.VEHICLE_ID}`}
        className="adm-btn adm-btn-ghost adm-btn-sm"
      >
        PHOTOS
      </Link>
    </div>
  );
}
