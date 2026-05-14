import {
  Award,
  Building2,
  Calendar,
  Globe,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { companyInfo } from "@/lib/portal-data/company-info"

export const metadata = {
  title: "О компании",
}

const valueIcons = [Award, Users, Lightbulb, ShieldCheck]

function pluralYears(n: number): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return "лет"
  if (mod10 === 1) return "год"
  if (mod10 >= 2 && mod10 <= 4) return "года"
  return "лет"
}

export default function AboutPage() {
  const yearsOnMarket = Math.max(
    0,
    new Date().getFullYear() - companyInfo.foundedYear
  )
  const phoneDigits = companyInfo.phone.replace(/[^+\d]/g, "")
  const websiteLabel = companyInfo.website.replace(/^https?:\/\//, "")

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-xl p-6 text-white md:p-10"
        style={{
          background:
            "linear-gradient(135deg, #16223b 0%, #28367b 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          aria-hidden="true"
        >
          <Building2 className="absolute right-6 top-6 h-40 w-40" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm uppercase tracking-wider text-white/70">
            {companyInfo.fullName}
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            {companyInfo.name}
          </h1>
          <p className="mt-4 text-base text-white/80 md:text-lg">
            {companyInfo.description}
          </p>
        </div>
      </section>

      <Card className="flex items-start gap-4 p-6">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Target className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Наша миссия
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {companyInfo.mission}
          </p>
        </div>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Наши ценности</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {companyInfo.values.map((value, index) => {
            const Icon = valueIcons[index] ?? Award
            return (
              <Card key={value.title} className="flex items-start gap-4 p-6">
                <div className="rounded-lg bg-secondary/10 p-3 text-secondary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          Контактная информация
        </h2>
        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <a
            href={`tel:${phoneDigits}`}
            className="flex items-center gap-3 text-sm text-card-foreground transition-colors hover:text-primary"
          >
            <Phone className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span>{companyInfo.phone}</span>
          </a>
          <a
            href={`mailto:${companyInfo.email}`}
            className="flex items-center gap-3 text-sm text-card-foreground transition-colors hover:text-primary"
          >
            <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span>{companyInfo.email}</span>
          </a>
          <div className="flex items-center gap-3 text-sm text-card-foreground">
            <MapPin
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{companyInfo.address}</span>
          </div>
          <a
            href={companyInfo.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 text-sm text-card-foreground transition-colors hover:text-primary"
          >
            <Globe
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <span>{websiteLabel}</span>
          </a>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Компания в цифрах</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 text-center">
            <Calendar
              className="mx-auto h-8 w-8 text-primary"
              aria-hidden="true"
            />
            <p className="mt-3 text-3xl font-bold text-card-foreground">
              {companyInfo.foundedYear}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Год основания</p>
          </Card>
          <Card className="p-6 text-center">
            <Award
              className="mx-auto h-8 w-8 text-primary"
              aria-hidden="true"
            />
            <p className="mt-3 text-3xl font-bold text-card-foreground">
              {yearsOnMarket} {pluralYears(yearsOnMarket)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">На рынке</p>
          </Card>
          <Card className="p-6 text-center">
            <Users
              className="mx-auto h-8 w-8 text-primary"
              aria-hidden="true"
            />
            <p className="mt-3 text-3xl font-bold text-card-foreground">
              {companyInfo.employeeCount}+
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Сотрудников</p>
          </Card>
        </div>
      </section>
    </div>
  )
}
