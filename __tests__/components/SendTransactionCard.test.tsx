import { render, screen, fireEvent } from "@testing-library/react";
import { ChainFaucetPicker } from "@/components/ChainFaucetPicker";

describe("ChainFaucetPicker", () => {
  it("renders empty state when chains is empty", () => {
    render(<ChainFaucetPicker chains={[]} />);

    expect(
      screen.queryByText("No faucet entries found in chains.yaml")
    ).not.toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("renders options sorted by name and shows faucets for the selected chain", () => {
    render(
      <ChainFaucetPicker
        chains={[
          { chainId: 2, name: "B Chain", faucets: ["https://b.example/faucet"] },
          {
            chainId: 1,
            name: "A Chain",
            faucets: ["https://a.example/faucet-1", "https://a.example/faucet-2"],
          },
        ]}
      />
    );

    expect(
      screen.queryByPlaceholderText("Search chains...")
    ).not.toBeNull();

    const select = screen.getByRole("combobox");
    expect((select as HTMLSelectElement).value).toBe("1");

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect((links[0] as HTMLAnchorElement).href).toBe("https://a.example/faucet-1");
    expect((links[1] as HTMLAnchorElement).href).toBe("https://a.example/faucet-2");
  });

  it("updates faucets when changing selection", () => {
    render(
      <ChainFaucetPicker
        chains={[
          { chainId: 2, name: "B Chain", faucets: ["https://b.example/faucet"] },
          { chainId: 1, name: "A Chain", faucets: ["https://a.example/faucet"] },
        ]}
      />
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "2" } });

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLAnchorElement).href).toBe("https://b.example/faucet");
  });

  it("filters the chain list by search query", () => {
    render(
      <ChainFaucetPicker
        chains={[
          { chainId: 2, name: "B Chain", faucets: ["https://b.example/faucet"] },
          { chainId: 1, name: "A Chain", faucets: ["https://a.example/faucet"] },
          { chainId: 10, name: "Z Chain", faucets: ["https://z.example/faucet"] },
        ]}
      />
    );

    const input = screen.getByPlaceholderText("Search chains...");
    const select = screen.getByRole("combobox") as HTMLSelectElement;

    expect(select.querySelectorAll("option").length).toBe(3);

    fireEvent.change(input, { target: { value: "Z" } });
    expect(select.querySelectorAll("option").length).toBe(2);
    expect(select.options[0]?.textContent).toContain("A Chain");
    expect(select.options[1]?.textContent).toContain("Z Chain");

    fireEvent.change(input, { target: { value: "10" } });
    expect(select.querySelectorAll("option").length).toBe(2);
    expect(select.options[0]?.textContent).toContain("A Chain");
    expect(select.options[1]?.textContent).toContain("Z Chain");
  });
});
