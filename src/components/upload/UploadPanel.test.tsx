import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadPanel } from "./UploadPanel";
import { resetDataStore, useDataStore } from "@/store/useDataStore";
import { MIXED_CSV } from "@/test/fixtures";

describe("UploadPanel", () => {
  beforeEach(() => resetDataStore());

  it("loads the demo dataset and notifies the caller", async () => {
    const onImported = vi.fn();
    const user = userEvent.setup();
    render(<UploadPanel onImported={onImported} />);

    await user.click(screen.getByRole("button", { name: "Load demo dataset" }));

    expect(useDataStore.getState().status).toBe("ready");
    expect(useDataStore.getState().dataset?.rows).toHaveLength(720);
    expect(useDataStore.getState().dataset?.source).toBe("demo");
    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it("imports a CSV file chosen through the file input", async () => {
    const user = userEvent.setup();
    render(<UploadPanel />);
    const file = new File([MIXED_CSV], "stations.csv", { type: "text/csv" });

    await user.upload(screen.getByLabelText("Choose a CSV file"), file);

    await waitFor(() => expect(useDataStore.getState().status).toBe("ready"));
    expect(useDataStore.getState().dataset?.name).toBe("stations");
    expect(useDataStore.getState().dataset?.rows).toHaveLength(5);
    expect(useDataStore.getState().issues).toHaveLength(0);
  });

  it("shows a readable error for a header-only file", async () => {
    const user = userEvent.setup();
    render(<UploadPanel />);
    const file = new File(["A,B"], "header.csv", { type: "text/csv" });

    await user.upload(screen.getByLabelText("Choose a CSV file"), file);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Import failed");
    expect(alert).toHaveTextContent("Only a header row was found");
    expect(useDataStore.getState().dataset).toBeNull();
  });

  it("reports unsupported file types before reading", async () => {
    render(<UploadPanel />);
    const file = new File(["pdf"], "report.pdf", { type: "application/pdf" });
    await useDataStore.getState().loadFile(file);
    expect(useDataStore.getState().error).toMatch(/Unsupported file type/);
    expect(screen.getByRole("alert")).toHaveTextContent("Unsupported file type");
  });

  it("clears an error when a new file is chosen", async () => {
    const user = userEvent.setup();
    useDataStore.getState().fail("Something went wrong");
    render(<UploadPanel />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load demo dataset" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
