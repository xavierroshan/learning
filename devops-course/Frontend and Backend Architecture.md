This reference follows a React and TypeScript storefront and a Java Spring Boot backend from source files to production. It explains frontend routing, the API contract, builds, Azure hosting, and the path of a request through both applications.

# Part 0 Architecture overview

The store has two independent applications that only agree on an API contract:

- **Frontend**: React (TypeScript, built with Vite). Compiled into static files, stored in Azure Blob Storage, served through a CDN, and **executed in the user's browser**.

- **Backend**: Java Spring Boot. Compiled into a JAR, packaged in a container, and **executed on your servers**, where it talks to the database.

They communicate over HTTP with JSON. The addresses used throughout:

| Address | What's behind it |
| :--- | :--- |
| `https://www.store.com` | CDN (Azure Front Door) → `$web` storage container (frontend files) |
| `https://api.store.com` | API gateway → load balancer → Java containers |
| `https://media.store.com` | CDN → `media` storage container (product photos) |

## The repository

```
store-app/
├── frontend/                            ← React app
│   ├── index.html                       ← HTML template Vite builds from
│   ├── src/
│   │   ├── main.tsx                     ← entry point: mounts React into the page
│   │   ├── App.tsx                      ← root component + routing table
│   │   ├── auth.tsx                     ← login state, provides the user's token
│   │   ├── pages/ProductPage.tsx        ← the product page UI
│   │   ├── api/client.ts                ← all calls to the Java backend
│   │   └── styles/main.css
│   ├── public/
│   │   ├── favicon.ico
│   │   └── logo.svg
│   ├── .env.development                 ← settings for local dev
│   ├── .env.production                  ← settings baked into the production build
│   ├── vite.config.ts                   ← build tool configuration
│   └── package.json                     ← dependencies + scripts
├── backend/                             ← Spring Boot app
│   ├── src/main/java/com/store/
│   │   ├── StoreApplication.java
│   │   ├── product/
│   │   │   ├── Product.java             ← JPA entity (maps to DB table)
│   │   │   ├── ProductRepository.java   ← data access
│   │   │   ├── ProductService.java      ← business logic
│   │   │   ├── ProductController.java   ← HTTP endpoints
│   │   │   └── ProductResponse.java     ← JSON shape sent to the frontend
│   │   ├── cart/
│   │   │   ├── CartController.java
│   │   │   ├── CartService.java
│   │   │   └── AddToCartRequest.java
│   │   └── config/
│   │       ├── SecurityConfig.java      ← JWT auth + CORS
│   │       └── GlobalExceptionHandler.java
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/V1__create_products.sql
│   ├── pom.xml
│   └── Dockerfile
└── .github/workflows/deploy.yml         ← CI/CD pipeline

```

# Part 1 Frontend source files

This is where developers write the frontend. These files use **TypeScript** and **JSX/TSX** (HTML-like syntax inside code), which browsers cannot run directly. They must be compiled first (Part 3).

The four core files form a chain, each with one job:

```
main.tsx        → starts React and puts it on the page
   └── App.tsx        → decides which page to show for the current URL
         └── ProductPage.tsx   → draws the page and asks for data
               └── client.ts         → actually talks to the Java backend

```

## 1.1 index.html the empty shell

Strictly speaking this lives at `frontend/index.html`, not in `src/`, but it's where everything begins:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <title>Store</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

The `<div id="root">` is empty. React will fill it. The `<script>` tag points at `main.tsx`; during the build, Vite rewrites this to point at the compiled bundle instead.

## 1.2 main.tsx the entry point

**What it does:** The absolute starting point of the application.

**How it works:** It finds the `<div id="root">` element in `index.html` and tells React to render the entire application inside it. It also wraps the app in "providers": components that make shared services available to everything below them.

```tsx
// frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth";
import App from "./App";
import "./styles/main.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>        {/* enables URL-based routing using the browser's address bar */}
      <AuthProvider>       {/* makes the logged-in user's token available to any page */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

```

`BrowserRouter` is what lets `App.tsx` read and react to the URL. Without it, the routing below wouldn't work.

## 1.3 App.tsx the root component and router

**What it does:** It's the main structural layout of the website and manages routing.

**How it works:** It defines which component to show for which URL. In plain terms: "When a user visits `/products/:id`, load and display the `ProductPage` component." It acts as a **traffic controller** for the frontend.

```tsx
// frontend/src/App.tsx
import { Routes, Route } from "react-router-dom";
import ProductPage from "./pages/ProductPage";

export default function App() {
  return (
    <Routes>
      <Route path="/products/:id" element={<ProductPage />} />
    </Routes>
  );
}

```

### Line by line

**The imports**

```tsx
import { Routes, Route } from "react-router-dom";
import ProductPage from "./pages/ProductPage";

```

- **`Routes` and `Route`** come from the React Router library. `Routes` is a container for all the route rules; each `Route` defines one mapping from a URL pattern to a component.

- **`ProductPage`** imports the component from `pages/ProductPage.tsx`, so the router knows what to render.

**The component**

```tsx
export default function App() {
  return (
    <Routes>
      <Route path="/products/:id" element={<ProductPage />} />
    </Routes>
  );
}

```

- **`export default function App()`**: the root component. When `main.tsx` boots the application, `App` is the first of your own components to render.

- **`<Routes>`**: watches the current URL path and looks inside itself for the best-matching `<Route>`. Only that route's component is rendered.

- **`<Route path="..." element={...} />`**: one matching rule. `path` is the URL pattern; `element` is what to display when it matches.

### Product route pattern explained

The pattern is split into segments by forward slashes, and each segment tells the router how to match the address bar.

**1. `/` (forward slashes): segment separators.** Like folders on your computer (`Documents/Projects/Store`), slashes break the path into pieces the router evaluates one by one.

**2. `products`: a static segment.** A strict, literal match. The URL must contain exactly the word `products` in exactly this position.

- ✅ `/products/123` matches.

- ❌ `/items/123` or `/prod/123` don't match.

**3. `:id`: a dynamic path parameter.**

- The **colon** turns the segment into a variable. It tells React Router: "Don't look for a literal folder named `id`. Accept whatever value is written here and call it `id`."

- The word **`id`** is the variable's name. Inside `ProductPage`, calling `useParams()` returns an object using exactly this key: `{ id: "1234" }`. If the route were `/products/:productId`, you'd read `productId` instead.

**How a URL is evaluated**, for `https://www.store.com/products/99`:

| Segment in URL | Pattern segment | Type | Router asks | Result |
| :--- | :--- | :--- | :--- | :--- |
| `products` | `products` | Static | "Is this exactly 'products'?" | Yes, keep going |
| `99` | `:id` | Dynamic | "Capture whatever is here as `id`." | `id = "99"` |

**More examples:**

| URL visited | Matches? | `id` captured | Rendered |
| :--- | :--- | :--- | :--- |
| `/products/101` | Yes | `"101"` | `ProductPage` for 101 |
| `/products/9999` | Yes | `"9999"` | `ProductPage` for 9999 |
| `/products/abc` | Yes | `"abc"` | `ProductPage`, which will then get an error from the backend (see Part 9) |
| `/products/99?color=red` | Yes | `"99"` | Query strings aren't part of the path; read them with `useSearchParams()` |
| `/products` | No | — | Nothing, since the `:id` segment is missing |
| `/products/99/reviews` | No | — | Nothing, since there's an extra segment (unless you add a route for it) |

Two important details:

- **Captured values are always strings.** `"99"`, not the number `99`. The router has no idea it's meant to be a number; conversion and validation happen later.

- **The router doesn't check whether product 99 exists.** It only matches the *shape* of the URL. Whether the product is real is the backend's job.

### A more realistic routing table

A real store would have more routes, including a fallback for broken links:

```tsx
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />                    {/* catalogue */}
      <Route path="/products/:id" element={<ProductPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/orders/:orderId" element={<OrderDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />                {/* anything else */}
    </Routes>
  );
}

```

The `*` route catches every URL that nothing else matched, showing a friendly "page not found" screen.

### React routing in the browser

When a user clicks a link from the home page to `/products/99`, React Router changes the address bar using the browser's History API and swaps components, **without asking any server for a new page**. That's why navigation in a React app feels instant.

The server only sees a page URL in two situations: the **first visit**, and a **refresh or shared link** (someone pastes `www.store.com/products/99` into a new tab). In those cases, the browser asks the CDN for `/products/99`, a file that doesn't exist in storage. This matters for deployment, covered in Part 4.

## 1.4 pages/ProductPage.tsx the user interface

**What it does:** Controls the visual layout of the product page.

**How it works:** It reads the product ID from the URL, shows a "Loading…" state, triggers the data fetch, then displays the image, name, price, and the "Add to cart" button.

```tsx
// frontend/src/pages/ProductPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProduct, addToCart, Product } from "../api/client";
import { useAuth } from "../auth";

export default function ProductPage() {
  const { id } = useParams();                    // "1234", captured by the :id in App.tsx
  const { token } = useAuth();                   // the logged-in user's JWT
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProduct(id!).then(setProduct).catch(e => setError(e.message));
  }, [id]);                                      // re-fetch if the id in the URL changes

  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <main>
      <img src={product.imageUrl} alt={product.name} />
      <h1>{product.name}</h1>
      <p>{product.price.toFixed(2)} {product.currency}</p>
      <button
        disabled={!product.inStock}
        onClick={() => addToCart(product.id, 1, token)}
      >
        {product.inStock ? "Add to cart" : "Out of stock"}
      </button>
    </main>
  );
}

```

How the pieces work:

- **`useParams()`** reads the values captured by the route pattern. This is the direct link between `App.tsx`'s `:id` and this page.

- **`useState`** holds data that, when changed, makes React redraw the component: first `null` (shows "Loading…"), then the product (shows the page), or an error.

- **`useEffect`** runs code after the component first appears: here, fetching the product. The `[id]` dependency means "run again whenever `id` changes", so navigating from product 99 to product 100 fetches the new product without remounting the page.

- **Disabling the button** when out of stock is a convenience only. The backend still enforces stock, because anyone can bypass the frontend.

There's no SQL, no price calculation, and no secret key anywhere in this file.

## 1.5 api/client.ts the bridge to the Java backend

**What it does:** Handles all direct communication with the backend.

**How it works:** It contains the browser `fetch()` calls that send data to and receive data from the Java API. Keeping every API call in one file means the rest of the frontend never needs to know URLs, headers, or error formats.

```ts
// frontend/src/api/client.ts
const API = import.meta.env.VITE_API_BASE_URL;   // "/api" locally, "https://api.store.com" in production

export type Product = {
  id: number;
  name: string;
  price: number;
  currency: string;
  inStock: boolean;
  imageUrl: string;
};

export async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`${API}/products/${id}`);
  if (!res.ok) throw new Error(`Failed to load product (HTTP ${res.status})`);
  return res.json();
}

export async function addToCart(productId: number, quantity: number, token: string) {
  const res = await fetch(`${API}/cart/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!res.ok) {
    const problem = await res.json();            // Java sends a ProblemDetail on errors
    throw new Error(problem.detail ?? "Could not add to cart");
  }
  return res.json() as Promise<{ itemCount: number; subtotal: number }>;
}

```

The `Product` type mirrors the Java `ProductResponse` record (Part 6). That shared shape is the **API contract**: if the backend renames a field, this type and the components using it must change too.

## 1.6 How the frontend files connect

```
[Browser address bar]  https://www.store.com/products/101
        │
        ▼
1. App.tsx          matches "/products/:id", captures id = "101", renders ProductPage
        │
        ▼
2. ProductPage.tsx  useParams() → "101", shows "Loading…", calls getProduct("101")
        │
        ▼
3. client.ts        fetch("https://api.store.com/products/101")
        │
        ▼
4. Java backend     returns JSON  →  ProductPage stores it  →  React redraws the page

```

# Part 2 Frontend configuration and assets

These files control how the project builds, runs, and what it's allowed to depend on.

## 2.1 public/

**What it does:** Holds raw files that don't need processing.

**How it works:** Vite leaves these completely alone and copies them as-is into the root of the `dist/` output. They keep their exact names (no hashes), which suits files that must live at a fixed URL, like `/favicon.ico` or `/robots.txt`.

## 2.2 .env.development and .env.production

**What they do:** Store settings that differ by environment.

**How they work:** Vite reads the matching file at build time and **bakes the values directly into the compiled JavaScript**.

```bash
# frontend/.env.development   (used by `npm run dev`)
VITE_API_BASE_URL=/api

# frontend/.env.production    (used by `npm run build`)
VITE_API_BASE_URL=https://api.store.com

```

Two important rules:

- Only variables prefixed with `VITE_` are exposed to frontend code, to prevent accidentally leaking other environment variables.

- **Everything here becomes public.** Anyone can open DevTools and read it in the downloaded JS. An API *address* is fine; a database password or private API key must never go in a frontend `.env` file.

(An alternative some teams use: route `/api/*` on the same domain through the CDN to the backend, so production also uses `VITE_API_BASE_URL=/api`. Same code, no CORS. This example keeps the separate `api.` subdomain to make the two destinations obvious.)

## 2.3 vite.config.ts build instructions

**What it does:** Configures Vite, the build tool.

**How it works:** Tells Vite to compile React/TypeScript, how to optimise the production bundle, and, for local development, to forward `/api` calls to the Java server running on the developer's laptop:

```ts
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",          // local Spring Boot
        rewrite: path => path.replace(/^\/api/, ""),
      },
    },
  },
});

```

So in development, `getProduct("101")` calls `/api/products/101` on the Vite dev server (`localhost:5173`), which forwards it to `http://localhost:8080/products/101`. The browser only ever talks to one origin, so CORS isn't an issue locally.

## 2.4 package.json the project manifest

**What it does:** Lists third-party libraries and defines command shortcuts.

```json
{
  "name": "store-frontend",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}

```

`dependencies` end up in the user's browser (bundled into `vendor-*.js`); `devDependencies` are tools used only on the build machine. A lock file (`package-lock.json`) pins exact versions so every build is reproducible.

# Part 3 Frontend production build

Running `npm run build` makes Vite take the many development files, check the TypeScript, convert JSX to plain JavaScript, bundle modules together, minify (strip whitespace, shorten names), and output static files any browser can run:

```
frontend/dist/
├── index.html            ← the only HTML file; now points at the compiled bundles
├── favicon.ico           ← copied unchanged from public/
├── logo.svg              ← copied unchanged from public/
└── assets/
    ├── index-3f9a2c.js   ← your code: main.tsx, App, ProductPage, client.ts, compiled together
    ├── vendor-a71b09.js  ← libraries: React, React Router
    └── index-8b17e0.css  ← all styles combined

```

The compiled `index.html` now references the bundles:

```html
<script type="module" src="/assets/index-3f9a2c.js"></script>
<link rel="stylesheet" href="/assets/index-8b17e0.css">

```

This folder is the **entire frontend in production**. The `.tsx` source, `node_modules`, `package.json`, and `.env` files never leave the build machine (only the `VITE_` values baked into the JS do).

## Content hashes and cache busting

The suffixes like `-3f9a2c` are **content hashes**, used for **cache busting**. Each is a fingerprint of the file's contents, so it changes whenever the code changes and stays the same when it doesn't.

This enables a two-tier caching strategy:

- **Hashed files** are cached by the CDN and browsers for a year (`Cache-Control: public, max-age=31536000, immutable`). Safe, because the content at that exact filename can never change.

- **`index.html`** is never cached long (`Cache-Control: no-cache`), so browsers always check for the latest one.

When you deploy an update, the new `index.html` points at `index-4g2b8d.js` instead of `index-3f9a2c.js`. Browsers fetch the fresh `index.html`, see a filename they've never seen, and download the new code. Unchanged files, like the React library in `vendor-a71b09.js`, keep their hash and stay cached, so users only download what actually changed. And because old and new filenames differ, a browser can never mix old JavaScript with a new page.

# Part 4 Frontend deployment to Azure

Because `dist/` contains only static files, **no running server is needed** to host it.

1. The pipeline uploads the contents of `dist/` into the Azure Blob Storage container named `$web`, uploading the hashed `assets/` **first** and `index.html` **last**, so there's never a moment when `index.html` points at a file that doesn't exist yet.

2. Azure's **Static Website Hosting** feature is enabled on the storage account, so it serves files over HTTP.

3. Azure Front Door (the CDN) sits in front, using storage as its **origin**, caching files at edge locations near users and handling HTTPS for `www.store.com`.

4. After upload, the pipeline **purges** `index.html` from the CDN so edges fetch the new version.

5. When a customer visits, they receive `index.html`, the browser downloads the JS bundle, React starts, and the storefront renders inside the user's browser.

## Direct links and SPA fallback

Recall from Part 1.3 that React routes like `/products/101` **don't exist as files**. Storage only contains `index.html` and the `assets/` folder. So when someone refreshes the page or opens a shared link to `www.store.com/products/101`, storage would normally answer `404 Not Found`.

The fix is an **SPA fallback**: configure the hosting to return `index.html` for any path that isn't a real file. On Azure Static Website Hosting, you set the "error document path" to `index.html`; on Front Door, a URL rewrite rule does it more cleanly (returning `200` instead of `404`). Then:

1. The browser requests `/products/101`.

2. The CDN returns `index.html`.

3. React boots, `BrowserRouter` reads `/products/101` from the address bar, `App.tsx` matches `/products/:id`, and the correct page appears.

Without this rule, the app works perfectly when navigating by clicking but breaks on refresh, one of the most common React deployment bugs.

# Part 5 Java Spring Boot source files

Now the server side. The same layering ideas apply (entry point, routing, UI-equivalent logic, data access), but this code runs on trusted machines and owns data and rules.

## 5.1 pom.xml dependencies

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.3.4</version>
</parent>

<dependencies>
  <!-- Embedded Tomcat web server + REST controllers + JSON (Jackson) -->
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
  <!-- JPA / Hibernate ORM + HikariCP connection pool -->
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
  <!-- PostgreSQL JDBC driver -->
  <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
  <!-- Input validation (@NotNull, @Min ...) -->
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
  <!-- JWT validation -->
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-oauth2-resource-server</artifactId></dependency>
  <!-- /actuator/health endpoints for load balancer health checks -->
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
  <!-- Database migrations -->
  <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-database-postgresql</artifactId></dependency>
</dependencies>

```

Each maps to a layer from earlier: Tomcat is the web server, Hibernate the ORM, HikariCP the connection pool, the PostgreSQL driver speaks the database wire protocol, and Actuator provides health checks for the load balancer.

## 5.2 StoreApplication.java the entry point

```java
@SpringBootApplication
public class StoreApplication {
    public static void main(String[] args) {
        SpringApplication.run(StoreApplication.class, args);
    }
}

```

`main()` starts Spring, which scans the packages, creates every controller, service, and repository, wires them together (dependency injection), opens the database connection pool, and starts Tomcat on port 8080.

## 5.3 The database table

```sql
-- backend/src/main/resources/db/migration/V1__create_products.sql
CREATE TABLE products (
    id          BIGINT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    price       NUMERIC(10,2) NOT NULL,
    currency    CHAR(3) NOT NULL DEFAULT 'CAD',
    stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_path  VARCHAR(300)
);

```

## 5.4 Product.java entity mapped to the table

```java
@Entity
@Table(name = "products")
public class Product {
    @Id
    private Long id;
    private String name;
    private BigDecimal price;          // BigDecimal, never double, for money
    private String currency;
    private Integer stock;
    private String imagePath;          // maps to the image_path column

    protected Product() {}             // required by JPA
    // getters omitted for brevity
}

```

## 5.5 ProductRepository.java data access

```java
public interface ProductRepository extends JpaRepository<Product, Long> {
    // findById(), save(), delete() etc. are generated automatically by Spring Data
}

```

No SQL is written here. Spring Data generates the implementation at startup, and Hibernate turns `findById(1234L)` into a parameterised query.

## 5.6 ProductResponse.java the JSON contract

```java
public record ProductResponse(
        Long id,
        String name,
        BigDecimal price,
        String currency,
        boolean inStock,
        String imageUrl) {}

```

This is the Java side of the contract that `client.ts`'s `Product` type mirrors. Notice the exact stock count isn't exposed, only `inStock`. The response model decides what's public.

## 5.7 ProductService.java business logic

```java
@Service
public class ProductService {
    private final ProductRepository repository;
    private final String mediaBaseUrl;

    public ProductService(ProductRepository repository,
                          @Value("${app.media-base-url}") String mediaBaseUrl) {
        this.repository = repository;
        this.mediaBaseUrl = mediaBaseUrl;
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(long id) {
        Product p = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product " + id + " not found"));

        return new ProductResponse(
                p.getId(), p.getName(), p.getPrice(), p.getCurrency(),
                p.getStock() > 0,
                mediaBaseUrl + p.getImagePath());   // https://media.store.com/products/1234/main.webp
    }
}

```

## 5.8 ProductController.java HTTP endpoints

```java
@RestController
@RequestMapping("/products")
public class ProductController {
    private final ProductService service;

    public ProductController(ProductService service) { this.service = service; }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> get(@PathVariable long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(service.getProduct(id));
    }
}

```

Look closely at `@RequestMapping("/products")` + `@GetMapping("/{id}")`: that's the pattern `/products/{id}`. The **`{id}` is Spring's equivalent of React Router's `:id`**, a dynamic path segment, and `@PathVariable long id` is Spring's equivalent of `useParams()`. One difference: Spring converts the value to a `long` for you, and rejects it if it can't (see Part 9).

### Frontend and backend routing

This is a frequent point of confusion, so it's worth stating directly. The app has **two separate routing systems**, and the similar-looking URLs are not the same thing:

| Aspect | React Router (`App.tsx`) | Spring (`@GetMapping`) |
| :--- | :--- | :--- |
| Runs in | The user's browser | Your server |
| URL example | `https://www.store.com/products/101` | `https://api.store.com/products/101` |
| Pattern syntax | `/products/:id` | `/products/{id}` |
| Reads the parameter with | `useParams()` → `"101"` (string) | `@PathVariable long id` → `101` (number) |
| Decides | Which **screen** to show | Which **Java method** handles the API call |
| Returns | A React component drawn on screen | JSON data |
| Shown in the address bar? | Yes, it's the page URL the user sees and shares | No, it's called behind the scenes by `fetch()` |

The page URL and the API URL just happen to look alike here because that's a tidy convention. They could be completely different (the page could be `/shop/item/101` while still calling `/products/101` on the API).

## 5.9 The cart accepting input safely

```java
// AddToCartRequest.java: incoming JSON, validated automatically
public record AddToCartRequest(
        @NotNull Long productId,
        @Min(1) @Max(10) int quantity) {}

```

```java
// CartController.java
@RestController
@RequestMapping("/cart")
public class CartController {
    private final CartService service;

    public CartController(CartService service) { this.service = service; }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public CartSummary addItem(@AuthenticationPrincipal Jwt jwt,
                               @Valid @RequestBody AddToCartRequest request) {
        String userId = jwt.getSubject();      // user identity from the validated token, never from the body
        return service.addItem(userId, request.productId(), request.quantity());
    }
}

```

The user's identity comes from the validated JWT, not from anything the frontend claims in the request body.

## 5.10 SecurityConfig.java authentication and CORS

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())                       // stateless JWT API, no session cookies
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**").permitAll()   // load balancer probes
                .requestMatchers(HttpMethod.GET, "/products/**").permitAll()
                .anyRequest().authenticated())                        // cart, orders need a token
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origin}") String allowedOrigin) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigin));             // https://www.store.com
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

```

This is the backend's half of the CORS handshake: it tells browsers that JavaScript served from `www.store.com` may call `api.store.com`.

## 5.11 GlobalExceptionHandler.java consistent errors

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(OutOfStockException.class)
    ProblemDetail outOfStock(OutOfStockException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }
    // Anything unhandled becomes a generic 500 without leaking stack traces
}

```

These ProblemDetail responses are what `client.ts` reads (`problem.detail`) to show the user a meaningful message.

## 5.12 application.yml configuration with placeholders, no secrets

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:5432/store?sslmode=require
    username: ${DB_USER}
    password: ${DB_PASSWORD}             # injected at runtime from Key Vault
    hikari:
      maximum-pool-size: 20              # connection pool size per instance
      connection-timeout: 3000           # ms to wait for a free connection
  jpa:
    open-in-view: false
  flyway:
    enabled: false                       # migrations run by the pipeline, not at startup
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${JWT_ISSUER}      # e.g. your Entra ID / Auth0 tenant

management:
  endpoint:
    health:
      probes:
        enabled: true                    # /actuator/health/liveness and /readiness

app:
  cors:
    allowed-origin: ${CORS_ORIGIN:http://localhost:5173}
  media-base-url: ${MEDIA_BASE_URL}

```

Compare with the frontend's `.env` files: frontend config is **baked in at build time and public**; backend config is **injected at startup and private**. That difference exists precisely because one runs on users' devices and the other on your servers.

# Part 6 Backend build and runtime

## From source to JAR

`mvn package` compiles everything into a single executable **"fat JAR"**: your compiled classes, every library from `pom.xml`, and an embedded Tomcat server.

```
backend/target/store-api-1.0.0.jar     (~50–80 MB)

```

## From JAR to container image

```dockerfile
# Stage 1: build with Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# Stage 2: small runtime image with just a JRE and the JAR
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/store-api-1.0.0.jar app.jar
EXPOSE 8080
USER 1000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

```

## What actually runs on each server

```
Container instance (e.g. 3 replicas on Azure Kubernetes Service, behind a load balancer)
├── Java 21 runtime (JRE)
└── /app/app.jar
      ├── com/store/**/*.class           ← your compiled code
      ├── BOOT-INF/lib/*.jar             ← Spring, Hibernate, HikariCP, Postgres driver, Tomcat
      └── application.yml                ← with ${...} placeholders

Injected at startup (not in the image):
  DB_HOST, DB_USER, DB_PASSWORD          ← from Key Vault / secrets
  JWT_ISSUER, CORS_ORIGIN, MEDIA_BASE_URL  ← environment variables

```

When a container starts, `java -jar app.jar` runs `main()`, Spring creates all the components, HikariCP opens database connections, Tomcat listens on port 8080, and `/actuator/health/readiness` begins returning `UP`. Only then does the load balancer start sending traffic.

## Build outputs and destinations

| Aspect | Frontend | Backend |
| :--- | :--- | :--- |
| Source | `.tsx`, `.ts`, `.css` | `.java`, `.yml`, `.sql` |
| Build command | `npm run build` | `mvn package` + `docker build` |
| Output | `dist/` folder of static files | Container image containing a fat JAR |
| Destination | Blob Storage `$web` (CDN origin) | Container registry → Kubernetes / Container Apps |
| Executes in | Each user's browser | Your servers |
| Contains secrets? | Never | Never in the image; injected at runtime |
| Config baked in? | Yes, at build time (public) | No, placeholders filled at startup (private) |

# Part 7 Deployment pipeline

```yaml
# .github/workflows/deploy.yml (simplified)
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
        working-directory: frontend
      - name: Upload hashed assets first, index.html last
        run: |
          az storage blob upload-batch -s frontend/dist -d '$web' --pattern 'assets/*' --overwrite
          az storage blob upload-batch -s frontend/dist -d '$web' --overwrite
      - name: Purge index.html from the CDN
        run: az afd endpoint purge --content-paths '/index.html' ...

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: mvn -B verify                       # compile + run tests
        working-directory: backend
      - name: Build and push container image
        run: |
          docker build -t storeacr.azurecr.io/store-api:${{ github.sha }} backend
          docker push storeacr.azurecr.io/store-api:${{ github.sha }}
      - name: Run database migrations
        run: flyway -url=$DB_URL migrate        # applies V1__create_products.sql etc.
      - name: Rolling deploy to Kubernetes
        run: kubectl set image deployment/store-api api=storeacr.azurecr.io/store-api:${{ github.sha }}

```

Two jobs, two destinations. A frontend change (a new button colour) never touches the Java servers; a backend change (a new discount rule) never touches storage or the CDN.

# Part 8 Request flow through both applications

The user pastes `https://www.store.com/products/1234` into a new browser tab.

## Steps 1 to 3 Frontend delivery through the CDN

1. The browser asks the CDN for `/products/1234`. No such file exists, so the **SPA fallback rule** returns `index.html`.

2. The browser parses it and downloads `index-3f9a2c.js`, `vendor-a71b09.js`, and `index-8b17e0.css` from the CDN edge (likely cached, immutable).

3. **`main.tsx`** runs: it mounts React into `<div id="root">` inside `BrowserRouter` and `AuthProvider`. **`App.tsx`** reads the address bar, matches `/products/:id`, and captures `id = "1234"`. **`ProductPage`** renders "Loading…".

## Step 4 React calls Java

`ProductPage`'s `useEffect` calls `getProduct("1234")`, and **`client.ts`** sends:

```
GET https://api.store.com/products/1234
Origin: https://www.store.com

```

This is the first moment your servers are involved.

## Step 5 Java request processing

After the API gateway and load balancer route the request to one of the three containers:

1. **Tomcat** accepts the connection on port 8080, parses the HTTP request, and assigns a worker thread.

2. **Servlet filter chain** (Spring's middleware): the CORS filter checks the origin; Spring Security sees `GET /products/**` is public, so no token is needed.

3. **DispatcherServlet**, Spring's central router, matches `GET /products/{id}` to `ProductController.get()` and converts `"1234"` into `long id = 1234`.

4. **`ProductController.get()`** calls `service.getProduct(1234)`.

5. **`ProductService.getProduct()`** starts a read-only transaction and calls `repository.findById(1234L)`.

6. **Hibernate** generates parameterised SQL:

```sql
select p.id, p.currency, p.image_path, p.name, p.price, p.stock
from products p
where p.id = ?
```

7. **HikariCP** lends an already-open connection; the **PostgreSQL JDBC driver** sends the query over TLS; PostgreSQL uses the primary-key index and returns one row.

8. Hibernate maps the row to a `Product`; the service builds a `ProductResponse`; the connection returns to the pool.

9. **Jackson** serialises the record to JSON, Spring adds `Cache-Control` and CORS headers, and Tomcat responds:

```
HTTP/1.1 200
Content-Type: application/json
Cache-Control: max-age=60, public
Access-Control-Allow-Origin: https://www.store.com

{"id":1234,"name":"Trail running shoes","price":129.99,"currency":"CAD",
 "inStock":true,"imageUrl":"https://media.store.com/products/1234/main.webp"}

```

## Step 6 React displays the response

`client.ts` parses the JSON; `ProductPage` calls `setProduct()`; React re-renders with the name, price, and button; the browser lays out and paints the page; and the `<img>` tag fetches the photo from the media CDN (again, no Java involved).

## Step 7 Add to cart

The user clicks the button. `client.ts` sends `POST https://api.store.com/cart/items` with the JWT. Because of the `Authorization` header, the browser first sends a CORS preflight `OPTIONS` request, which `SecurityConfig` approves. Then, in Java:

- Spring Security validates the token's signature and issuer before anything else runs (invalid → `401`).

- Jackson turns the body into `AddToCartRequest`; `@Valid` checks `quantity` is 1–10 (invalid → `400`, automatically).

- `CartController.addItem()` takes the user ID from the token and calls `CartService`.

- If the item just sold out, `OutOfStockException` becomes a `409` ProblemDetail via `GlobalExceptionHandler`, and `client.ts` displays its `detail` message.

- On success, `201 Created` with `{ "itemCount": 1, "subtotal": 129.99 }`, and React updates the cart icon. No page reload.

# Part 9 Invalid product URLs

This example ties both routers together and shows why validation belongs on the server:

1. **React Router** matches `/products/abc` happily. `:id` accepts any text, so `id = "abc"` and `ProductPage` renders.

2. **`client.ts`** calls `GET https://api.store.com/products/abc`.

3. **Spring** matches `/products/{id}` but can't convert `"abc"` into a `long`, so it rejects the request with **`400 Bad Request`** before your controller code even runs.

4. `getProduct` sees `res.ok === false` and throws; `ProductPage` shows "Failed to load product (HTTP 400)".

For `/products/99999` (a number, but no such product), Spring converts it fine, the service throws `NotFoundException`, and the frontend gets a `404`. A polished app would show a friendly "Product not found" screen for both cases.

The lesson: the frontend router only checks a URL's *shape*; the backend checks whether the value is *valid* and the data *exists*.

# Part 10 Frontend and backend responsibilities

| Concern | React (browser) | Spring Boot (server) |
| :--- | :--- | :--- |
| Starting the app | `main.tsx` mounts React | `StoreApplication.main()` starts Spring + Tomcat |
| Mapping URLs | `App.tsx`: page URL → component (`:id`) | Controllers: API URL → Java method (`{id}`) |
| Layout, styling, buttons | Components + CSS | — |
| Talking to the other side | `client.ts` (`fetch`) | Returns JSON, sets CORS headers |
| Who the user is | Holds the token, attaches it | Spring Security validates it |
| Input rules | Optional, for convenience (disable the button) | Mandatory (`@Valid`, type conversion), since clients can be bypassed |
| Prices, stock, business rules | Displays them | Computes and enforces them |
| Database access | Never | Spring Data JPA → Hibernate → HikariCP → JDBC |
| Configuration | `.env` files, baked in at build time, public | `application.yml` + injected env vars, private |
| Secrets | Never | Injected at runtime from Key Vault |
| Error presentation | Shows a friendly message | Returns the correct status + ProblemDetail |
| Where it lives in production | `$web` storage, cached on CDN edges | Container image running behind a load balancer |

# Part 11 Local development

Locally there's no CDN, gateway, or storage, just two processes:

```bash
# Terminal 1: Java backend on http://localhost:8080 (with a local Postgres in Docker)
cd backend && mvn spring-boot:run

# Terminal 2: React dev server on http://localhost:5173, with instant hot reload
cd frontend && npm run dev

```

The flow mirrors production, with local addresses:

```
Browser: http://localhost:5173/products/101
   → App.tsx matches /products/:id, id = "101"
   → ProductPage calls getProduct("101")
   → client.ts fetches /api/products/101            (VITE_API_BASE_URL=/api)
   → Vite dev server proxy forwards to http://localhost:8080/products/101
   → Spring's ProductController.get(101) → local Postgres → JSON back

```

Same code, same API contract, same communication pattern. Only the addresses and the hosting change between laptop and production, which is the core strength of separating frontend and backend: each half can be developed, tested, and deployed on its own, as long as both keep honouring the contract between `client.ts` and the Java controllers.