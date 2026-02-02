import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { StatusBadge } from "../../src/components/StatusBadge";


describe("StatusBadge", () => {
  it("renders a label", () => {
    const html = renderToString(<StatusBadge status="fresh" />);
    expect(html).toContain("span");
  });
});