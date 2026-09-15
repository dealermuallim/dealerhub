import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowUpRight,
  Camera,
  CarFront,
  CircleCheck,
  EyeOff,
  Gauge,
  Plus,
  Timer,
  TrendingUp,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import StatCard from "@/components/admin/StatCard";
import SectionCard from "@/components/admin/SectionCard";
import WeeklyTarget from "@/components/admin/WeeklyTarget";
import VehicleActions from "@/components/admin/VehicleActions";
import { money } from "@/components/admin/demo-data";
import { getPublicTenantByHost } from "@/lib/tenant";
import { getAdminVehiclesByHost } from "@/lib/vehicles";
import { dealerMetrics, reportingTimeZone } from "@/lib/dealer-metrics";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const host = (await headers()).get("host") || "localhost";
  const now = new Date();
  let tenant;
  let vehicles;
  try {
    [tenant, vehicles] = await Promise.all([
      getPublicTenantByHost(host),
      getAdminVehiclesByHost(host),
    ]);
    if (!tenant) throw new Error("No dealership is configured for this host");
  } catch (error) {
    console.error("Admin dashboard load failed:", error);
    return (
      <AdminShell title="Dealer Dashboard">
        <section className="adm-card" role="alert">
          <h2>Your dashboard is temporarily unavailable</h2>
          <p>We couldn’t load your dealership data. Refresh to try again.</p>
          <a href="/admin" className="adm-btn adm-btn-primary">
            Retry dashboard
          </a>
        </section>
      </AdminShell>
    );
  }
  const timeZone = reportingTimeZone(tenant.TIMEZONE_NAME);
  const m = dealerMetrics(vehicles, now, timeZone);
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: timeZone,
  }).format(now);
  const lastMonthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${m.previousMonth}-01T12:00:00Z`));
  const maxFlow = Math.max(
    1,
    ...m.monthRows.flatMap((row) => [row.added, row.sold]),
  );
  const alerts = [
    {
      label: "Missing photos",
      count: m.missingPhotos,
      icon: Camera,
      filter: "photos",
      detail: "Give shoppers a closer look",
    },
    {
      label: "Hidden vehicles",
      count: m.hidden,
      icon: EyeOff,
      filter: "hidden",
      detail: "Review website visibility",
    },
    {
      label: "60+ days in inventory",
      count: m.aging,
      icon: Timer,
      filter: "aging",
      detail: "Consider a fresh price or photos",
    },
  ];
  return (
    <AdminShell
      title="Dealer Dashboard"
      subtitle={`${tenant.DEALER_NAME} · Your dealership at a glance`}
    >
      <section className="dh-hero">
        <div>
          <span className="dh-eyebrow">
            <Gauge size={16} /> YOUR DEALERSHIP. IN GEAR.
          </span>
          <h2>
            Make your next move
            <br />a good one.
          </h2>
          <p>
            {lastMonthName}:{" "}
            <strong>
              {m.lastMonth} {m.lastMonth === 1 ? "vehicle" : "vehicles"} sold
            </strong>{" "}
            with a recorded sale date.
            <br />
            {monthName} so far: {m.thisMonth} sold · {m.addedThisMonth} added.
          </p>
          <div className="dh-hero-actions">
            <Link
              href="/admin/inventory/new"
              className="adm-btn adm-btn-primary"
            >
              <Plus size={17} /> Add Vehicle
            </Link>
            <Link href="/admin/inventory" className="dh-hero-link">
              View inventory <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div className="dh-hero-total">
          <CarFront size={36} strokeWidth={1.4} />
          <strong>{m.active.length}</strong>
          <span>vehicles ready for their next owner</span>
          <span className="dh-hero-tag">
            {m.attention.length
              ? `${m.attention.length} could use your attention`
              : "Your available inventory is looking good"}
          </span>
        </div>
      </section>
      {m.undatedSold > 0 && (
        <div className="dh-notice" role="note">
          {m.undatedSold} sold{" "}
          {m.undatedSold === 1 ? "vehicle has" : "vehicles have"} no usable sale
          date. These are excluded from weekly and monthly totals.
        </div>
      )}
      <div className="adm-grid-4 dh-stats">
        <StatCard
          label="Sold this month"
          value={m.thisMonth}
          hint={`${monthName} to date · ${m.lastMonth} in all of ${lastMonthName}`}
        />
        <StatCard
          label="Sold this week"
          value={m.thisWeek}
          hint="Since Monday · recorded sales"
        />
        <StatCard
          label="Added this month"
          value={m.addedThisMonth}
          hint="Vehicles entered into the portal"
        />
        <StatCard
          label="Avg. days to sell"
          value={
            m.averageDaysToSell == null ? "—" : `${m.averageDaysToSell} days`
          }
          hint={
            m.averageDaysSample
              ? `${m.averageDaysSample} dated sales this month · since entry`
              : "Available after your first dated sale"
          }
        />
      </div>
      <div className="adm-grid-2 dh-dashboard-grid">
        <SectionCard title="Inventory in motion">
          <div className="dh-chart-legend">
            <span>
              <i className="dh-added-dot" /> Added
            </span>
            <span>
              <i className="dh-sold-dot" /> Sold
            </span>
            <small>Current month is partial</small>
          </div>
          <div
            className="dh-flow-chart"
            role="img"
            aria-label={m.monthRows
              .map((r) => `${r.key}: ${r.added} added, ${r.sold} sold`)
              .join("; ")}
          >
            {m.monthRows.map((row) => (
              <div className="dh-chart-column" key={row.key}>
                <div className="dh-chart-bars">
                  <div className="dh-bar-group">
                    <span>{row.added}</span>
                    <div
                      className="dh-bar dh-bar-added"
                      style={{ height: `${(row.added / maxFlow) * 110}px` }}
                    />
                  </div>
                  <div className="dh-bar-group">
                    <span>{row.sold}</span>
                    <div
                      className="dh-bar dh-bar-sold"
                      style={{ height: `${(row.sold / maxFlow) * 110}px` }}
                    />
                  </div>
                </div>
                <strong>{row.label}</strong>
              </div>
            ))}
          </div>
          <p className="dh-fine">
            Six months of recorded activity. Sold totals exclude vehicles later
            reopened or archived.
          </p>
        </SectionCard>
        <WeeklyTarget sold={m.thisWeek} dealerKey={String(tenant.TENANT_ID)} />
      </div>
      <section className="dh-attention-section">
        <div className="dh-section-head">
          <h2>A little attention goes a long way</h2>
          <span className="dh-fine">Available inventory only</span>
        </div>
        <div className="adm-grid-3">
          {alerts.map(({ label, count, icon: Icon, filter, detail }) => (
            <Link
              className="dh-alert-card"
              href={`/admin/inventory?filter=${filter}`}
              key={filter}
            >
              <Icon size={22} />
              <strong>{count}</strong>
              <span>
                {label}
                <small>{detail}</small>
              </span>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <div className="adm-grid-2 dh-dashboard-grid">
        <SectionCard
          title="Your next best actions"
          action={
            <Link
              href="/admin/inventory?filter=attention"
              className="dh-text-link"
            >
              View all <ArrowUpRight size={15} />
            </Link>
          }
        >
          {m.attention.length === 0 ? (
            <div className="dh-empty">
              <CircleCheck size={30} />
              <h3>All caught up</h3>
              <p>
                Your available vehicles have photos, visibility, pricing, and no
                60-day aging alerts.
              </p>
            </div>
          ) : (
            <div className="dh-attention-list">
              {m.attention.slice(0, 4).map(({ vehicle, reasons }) => (
                <article key={vehicle.VEHICLE_ID} className="dh-vehicle-task">
                  <div>
                    <strong>
                      {[vehicle.YEAR, vehicle.MAKE, vehicle.MODEL]
                        .filter(Boolean)
                        .join(" ") || "Vehicle"}
                    </strong>
                    <p className="dh-fine">
                      Stock {vehicle.STOCK_NUMBER || vehicle.VEHICLE_ID}
                    </p>
                    <div className="dh-reason-list">
                      {reasons.map((reason) => (
                        <span key={reason}>{reason}</span>
                      ))}
                    </div>
                  </div>
                  <VehicleActions vehicle={vehicle} />
                </article>
              ))}
            </div>
          )}
        </SectionCard>
        <div className="dh-side-stack">
          <SectionCard title="How long vehicles have been here">
            <div className="dh-age-list">
              {["Under 30 days", "30–59 days", "60–89 days", "90+ days"].map(
                (label, index) => (
                  <div key={label}>
                    <span>{label}</span>
                    <div className="dh-age-track">
                      <i
                        style={{
                          width: `${m.active.length ? (m.ageBuckets[index] / m.active.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <strong>{m.ageBuckets[index]}</strong>
                  </div>
                ),
              )}
            </div>
            <p className="dh-fine">
              Time since entry into DealerHub.
              {m.unknownAge
                ? ` ${m.unknownAge} vehicles have no usable entry date.`
                : ""}
            </p>
          </SectionCard>
          <section className="adm-card dh-value-card">
            <TrendingUp size={23} />
            <p className="dh-fine">{monthName} sold asking-price value</p>
            <strong>{money(m.soldAskingValue)}</strong>
            <p className="dh-fine">
              Current asking prices of this month’s dated sold vehicles. This is
              not actual revenue.
              {m.soldMissingPrice
                ? ` ${m.soldMissingPrice} have no positive asking price.`
                : ""}
            </p>
          </section>
        </div>
      </div>
      <details className="adm-card dh-metric-notes">
        <summary>How your numbers are calculated</summary>
        <p>
          Sales count vehicles currently marked Sold, using the most recent
          recorded transition into Sold. Editing a sold vehicle does not move
          its sale date. Reopened and archived vehicles are excluded; vehicles
          created directly as Sold without history have no known sale date.
        </p>
        <p>
          Weeks begin Monday. Calendar periods use {timeZone}. Average days to
          sell measures time from portal entry to the recorded sale, for this
          month’s sales with valid dates. Missing photos counts vehicles with no
          photo records.
        </p>
        <p>
          Weekly goals are a browser preference, not shared across devices.
          Figures reflect existing records, including any test vehicles still in
          inventory. Updated{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: timeZone,
          }).format(now)}
          .
        </p>
      </details>
    </AdminShell>
  );
}
