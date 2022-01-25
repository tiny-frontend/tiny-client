import { loadSmolFrontend } from "../lib";

const app = document.querySelector<HTMLDivElement>("#app")!;

loadSmolFrontend<(props: { name: string }) => unknown>({
  name: "ExampleSmolFrontend",
  contractVersion: "1.0.0",
  smolApiEndpoint: "https://api-cloudflare.pages.dev/api",
}).then((ExampleSmolFrontend) => {
  return window.ReactDOM.render(
    ExampleSmolFrontend({ name: "Hello" }),
    document.getElementById("root")
  );
});

app.innerHTML = `
  <div id="root"></div>
`;
