import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { renderMarkdown } from "@/lib/markdown";

export default async function AboutPage() {
  const s = await readSession();
  if (!s) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: "main" } });
  const name = org?.name ?? "SAYSANAA";

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        {org?.logoUrl ? (
          <div className="mb-5 flex items-center justify-center bg-bg/40 panel p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={org.logoUrl}
              alt={name}
              className="max-h-16 max-w-[300px] object-contain"
            />
          </div>
        ) : null}
        <h1 className="text-[28px] font-semibold tracking-tight text-gradient">
          {name}
        </h1>
        {org?.legalName && org.legalName !== org.name && (
          <p className="text-[13px] text-sub mt-1">{org.legalName}</p>
        )}
        {org?.tagline && (
          <p className="text-[14px] text-tx italic mt-2">{org.tagline}</p>
        )}
      </header>

      {org?.description && (
        <section className="panel p-6 mb-6">
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-sub font-medium mb-3">
            Танилцуулга
          </h2>
          <div
            className="prose-content text-[14px] leading-relaxed text-tx"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(org.description) }}
          />
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Contact */}
        <section className="panel p-5">
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-sub font-medium mb-3">
            Холбоо барих
          </h2>
          <dl className="space-y-2 text-[13px]">
            {org?.email && (
              <Row
                label="И-мэйл"
                value={
                  <a href={`mailto:${org.email}`} className="text-brand hover:underline">
                    {org.email}
                  </a>
                }
              />
            )}
            {org?.phone && <Row label="Утас" value={org.phone} />}
            {org?.website && (
              <Row
                label="Вэбсайт"
                value={
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    {org.website.replace(/^https?:\/\//, "")}
                  </a>
                }
              />
            )}
            {org?.address && <Row label="Хаяг" value={org.address} />}
            {!org?.email && !org?.phone && !org?.website && !org?.address && (
              <li className="text-sub text-[12px]">Холбоо барих мэдээлэл оруулаагүй</li>
            )}
          </dl>
        </section>

        {/* Registration */}
        <section className="panel p-5">
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-sub font-medium mb-3">
            Бүртгэл
          </h2>
          <dl className="space-y-2 text-[13px]">
            {org?.registerNumber && (
              <Row label="ТТД" value={<span className="font-mono">{org.registerNumber}</span>} />
            )}
            {org?.foundedYear && (
              <Row
                label="Үүсгэн байгуулагдсан"
                value={
                  <span className="tabular-nums">
                    {org.foundedYear} он
                  </span>
                }
              />
            )}
            {!org?.registerNumber && !org?.foundedYear && (
              <li className="text-sub text-[12px]">Бүртгэлийн мэдээлэл оруулаагүй</li>
            )}
          </dl>
        </section>
      </div>

      {/* Social */}
      {(org?.facebook || org?.instagram || org?.linkedin) && (
        <section className="panel p-5 mb-6">
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-sub font-medium mb-3">
            Сошиал сүлжээ
          </h2>
          <div className="flex flex-wrap gap-2">
            {org.facebook && (
              <SocialLink href={org.facebook} label="Facebook" />
            )}
            {org.instagram && (
              <SocialLink href={org.instagram} label="Instagram" />
            )}
            {org.linkedin && (
              <SocialLink href={org.linkedin} label="LinkedIn" />
            )}
          </div>
        </section>
      )}

      <p className="text-[11px] text-sub text-center">
        {org?.updatedAt
          ? `Шинэчилсэн: ${new Date(org.updatedAt).toLocaleDateString("mn-MN")}`
          : "Мэдээлэл оруулаагүй"}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="text-sub text-[11px] uppercase tracking-wider w-28 flex-shrink-0">
        {label}
      </dt>
      <dd className="text-tx">{value}</dd>
    </div>
  );
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-bd text-sub hover:text-tx hover:border-brand/40 text-[12px] transition"
    >
      {label} <span aria-hidden>↗</span>
    </a>
  );
}
