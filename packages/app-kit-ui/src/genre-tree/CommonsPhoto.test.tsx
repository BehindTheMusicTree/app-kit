import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CommonsPhoto from "./CommonsPhoto";

const image = {
  url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Band.jpg/500px-Band.jpg",
  pageUrl: "https://commons.wikimedia.org/wiki/File:Band.jpg",
  author: "Jane Doe",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
};

describe("CommonsPhoto", () => {
  afterEach(cleanup);

  it("shows the image with the given alt text", () => {
    render(<CommonsPhoto image={image} alt="Band" />);

    expect(screen.getByRole("img", { name: "Band" })).toHaveAttribute("src", image.url);
  });

  it("labels the credit with creditLabel", () => {
    render(<CommonsPhoto image={image} alt="Band" creditLabel="Image" />);

    expect(screen.getByRole("figure")).toHaveTextContent(/^Image: Jane Doe/);
  });

  it("defaults the credit label to Photo", () => {
    render(<CommonsPhoto image={image} alt="Band" />);

    expect(screen.getByRole("figure")).toHaveTextContent(/^Photo: Jane Doe/);
  });

  it("credits the author with a link to the Commons page in a new tab", () => {
    render(<CommonsPhoto image={image} alt="Band" />);

    const author = screen.getByRole("link", { name: "Jane Doe" });
    expect(author).toHaveAttribute("href", image.pageUrl);
    expect(author).toHaveAttribute("target", "_blank");
    expect(author).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links the license when it has a URL", () => {
    render(<CommonsPhoto image={image} alt="Band" />);

    expect(screen.getByRole("link", { name: "CC BY-SA 4.0" })).toHaveAttribute("href", image.licenseUrl);
  });

  it("shows the license as plain text without a URL", () => {
    render(<CommonsPhoto image={{ ...image, license: "Public domain", licenseUrl: null }} alt="Band" />);

    expect(screen.queryByRole("link", { name: "Public domain" })).not.toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveTextContent("Public domain");
  });

  it("credits Wikimedia Commons without an author", () => {
    render(<CommonsPhoto image={{ ...image, author: null }} alt="Band" />);

    expect(screen.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", image.pageUrl);
  });
});
