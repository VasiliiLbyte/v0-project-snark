import { Card } from "@/components/ui/card"

export const metadata = {
  title: "Бронирование переговорных",
}

export default function BookingPage() {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-card-foreground">
          Бронирование переговорных
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Раздел в разработке. Скоро здесь можно будет бронировать
          переговорные комнаты и оборудование онлайн.
        </p>
      </Card>
    </div>
  )
}
