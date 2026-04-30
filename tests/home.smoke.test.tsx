import { fireEvent, render, screen } from "@testing-library/react"
import Home from "@/app/page"

function clickSidebarItem(label: string) {
  const node = screen
    .getAllByText(label)
    .find((element) => Boolean(element.closest("aside")))

  if (!node) {
    throw new Error(`Sidebar item not found: ${label}`)
  }

  const button = node.closest("button")
  if (!button) {
    throw new Error(`Sidebar button not found for: ${label}`)
  }

  fireEvent.click(button)
}

describe("Home smoke", () => {
  it("renders dashboard by default", () => {
    render(<Home />)

    expect(screen.getByText("Добрый день, Иван!")).toBeInTheDocument()
    expect(screen.getByText("Последние новости")).toBeInTheDocument()
  })

  it("switches to employee directory", () => {
    render(<Home />)
    clickSidebarItem("Сотрудники")

    expect(screen.getByText("Справочник сотрудников")).toBeInTheDocument()
    expect(screen.getByText(/Всего в организации/i)).toBeInTheDocument()
  })

  it("switches to documents and profile sections", () => {
    render(<Home />)

    clickSidebarItem("Документы")
    expect(screen.getByRole("heading", { name: "Документы" })).toBeInTheDocument()

    clickSidebarItem("Мой профиль")
    expect(screen.getByRole("heading", { name: "Иван Петров" })).toBeInTheDocument()
    expect(screen.getByText("Мои задачи")).toBeInTheDocument()
  })
})
