import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DappsdkTestcase } from "@/components/DappsdkTestcase";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const TOKEN = "0x2b95EB0A2461BBFCe6d65fe6DE259795D7662532";
const SPENDER = "0x9A76e0d12832676d13C54B7F4dE659D9df875AB9";
const EXPECTED_DATA = `0x095ea7b3${"0".repeat(24)}${SPENDER.slice(2).toLowerCase()}${"0".repeat(62)}ff`;

function setApproveForm() {
  fireEvent.change(screen.getByLabelText("Token 合约地址"), {
    target: { value: TOKEN },
  });
  fireEvent.change(screen.getByLabelText("Spender 地址"), {
    target: { value: SPENDER },
  });
  fireEvent.change(screen.getByLabelText("Approve 数量"), {
    target: { value: "255" },
  });
}

describe("DappsdkTestcase approve simulation", () => {
  afterEach(() => {
    delete window.ethereum;
    jest.clearAllMocks();
  });

  it("previews approve transaction params with encoded calldata", async () => {
    const request = jest.fn().mockResolvedValue([ACCOUNT]);
    window.ethereum = {
      request,
    } as DAppEip1193Provider;

    render(<DappsdkTestcase />);
    setApproveForm();

    fireEvent.click(screen.getByRole("button", { name: "预览 approve" }));

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith({ method: "eth_accounts" });
      expect(screen.getByText(`eth_accounts[0]: ${ACCOUNT}`)).not.toBeNull();
      expect(
        screen.getByText((content) => content.includes(EXPECTED_DATA))
      ).not.toBeNull();
      expect(screen.getByText((content) => content.includes(`"to": "${TOKEN}"`))).not.toBeNull();
    });
  });

  it("sends approve transaction via eth_sendTransaction", async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce([ACCOUNT])
      .mockResolvedValueOnce("0xabc123");
    window.ethereum = {
      request,
    } as DAppEip1193Provider;

    render(<DappsdkTestcase />);
    setApproveForm();

    fireEvent.click(screen.getByRole("button", { name: "Run approve" }));

    await waitFor(() => {
      expect(request).toHaveBeenCalledTimes(2);
    });

    expect(request.mock.calls[0]?.[0]).toEqual({ method: "eth_accounts" });
    expect(request.mock.calls[1]?.[0]).toEqual({
      method: "eth_sendTransaction",
      params: [
        {
          from: ACCOUNT,
          to: TOKEN,
          value: "0x0",
          data: EXPECTED_DATA,
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("0xabc123")).not.toBeNull();
    });
  });
});
