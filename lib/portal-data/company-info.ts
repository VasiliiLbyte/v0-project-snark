export interface CompanyValue {
  title: string
  description: string
}

export interface CompanyInfo {
  name: string
  fullName: string
  description: string
  mission: string
  foundedYear: number
  address: string
  phone: string
  email: string
  website: string
  employeeCount: number
  values: CompanyValue[]
}

export const companyInfo: CompanyInfo = {
  name: "СНАРК",
  fullName: "ООО «СНАРК»",
  description:
    "Компания СНАРК специализируется на инжиниринге и комплексных решениях в области проектирования и строительства.",
  mission:
    "Создавать надёжные инженерные решения для устойчивого развития инфраструктуры.",
  foundedYear: 2010,
  address: "г. Санкт-Петербург",
  phone: "+7 (812) 000-00-00",
  email: "info@snark.ru",
  website: "https://snark.ru",
  employeeCount: 50,
  values: [
    { title: "Профессионализм", description: "Высокие стандарты в каждом проекте" },
    { title: "Командная работа", description: "Результат — заслуга всей команды" },
    { title: "Инновации", description: "Внедряем современные технологии" },
    { title: "Ответственность", description: "Берём на себя обязательства и выполняем их" },
  ],
}
