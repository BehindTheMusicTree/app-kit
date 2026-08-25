import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Rating from "./Rating";
import { FORM_RATING_NULL_VALUE } from "./lib/rating";

describe("Rating", () => {
  it("renders 6 radio inputs (null option + 5 stars)", () => {
    render(<Rating rating={null} handleChange={vi.fn()} />);

    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("checks the null-value radio when rating is null", () => {
    render(<Rating rating={null} handleChange={vi.fn()} />);

    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios[0].checked).toBe(true);
    expect(radios[0].value).toBe(String(FORM_RATING_NULL_VALUE));
    expect(radios.slice(1).every((r) => !r.checked)).toBe(true);
  });

  it("checks the matching star radio when rating is a number", () => {
    render(<Rating rating={3} handleChange={vi.fn()} />);

    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios[0].checked).toBe(false);
    expect(radios[3].checked).toBe(true);
    expect(radios[3].value).toBe("3");
  });

  it("checks nothing when rating is undefined", () => {
    render(<Rating rating={undefined} handleChange={vi.fn()} />);

    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.every((r) => !r.checked)).toBe(true);
  });

  it("calls handleChange when a star radio is selected", () => {
    const handleChange = vi.fn();
    render(<Rating rating={null} handleChange={handleChange} />);

    const radios = screen.getAllByRole("radio");
    (radios[2] as HTMLInputElement).click();

    expect(handleChange).toHaveBeenCalled();
  });
});
