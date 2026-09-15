import Link from "next/link";
import { money, type TemplateTheme } from "./theme";
import type { PublicVehicle } from "@/lib/vehicles";

type Props = {
  theme: TemplateTheme;
  vehicles: PublicVehicle[];
};

export default function FeaturedInventory({ theme, vehicles }: Props) {
  const featured = vehicles.filter((v) => v.FEATURED_YN === "Y");
  const list = (featured.length ? featured : vehicles).slice(0, 4);

  return (
    <section className="t02-section" id="featured">
      <div className="t02-wrap">
        <div className="t02-section-head t02-section-head-row">
          <div>
            <h2 style={{ color: theme.ink }}>Featured Inventory</h2>
            <p style={{ color: theme.muted }}>
              {list.length
                ? "Hand-picked vehicles from our current inventory."
                : "No vehicles listed yet - check back soon."}
            </p>
          </div>
          <Link href="/inventory" style={{ color: theme.secondary, fontWeight: 700 }}>
            View all
          </Link>
        </div>

        {list.length === 0 ? (
          <p style={{ color: theme.muted, margin: 0 }}>Inventory coming soon.</p>
        ) : (
          <div className="t02-vehicle-grid">
            {list.map((v) => {
              const name = [v.YEAR, v.MAKE, v.MODEL, v.TRIM].filter(Boolean).join(" ");
              return (
                <article key={v.VEHICLE_ID} className="t02-vehicle-card">
                  <div
                    className="t02-vehicle-photo"
                    style={{ background: "#e2e8f0", position: "relative" }}
                  >
                    {v.PRIMARY_IMAGE_URL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.PRIMARY_IMAGE_URL} alt={name || "Vehicle"} />
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          placeItems: "center",
                          height: "100%",
                          color: "#64748b",
                          fontSize: 13,
                        }}
                        aria-hidden
                      >
                        No photo
                      </div>
                    )}
                    {v.FEATURED_YN === "Y" ? (
                      <span className="t02-badge" style={{ background: theme.secondary }}>
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <div className="t02-vehicle-body">
                    <h3 style={{ color: theme.ink }}>{name || "Vehicle"}</h3>
                    <p className="t02-vehicle-meta" style={{ color: theme.muted }}>
                      {v.MILEAGE != null ? `${v.MILEAGE.toLocaleString()} miles` : "Mileage n/a"}
                      {v.ASKING_PRICE != null ? ` | ${money(Number(v.ASKING_PRICE))}` : ""}
                    </p>
                    <Link
                      href={`/vehicle/${v.VEHICLE_ID}`}
                      style={{ color: theme.secondary, fontWeight: 700 }}
                    >
                      View details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}