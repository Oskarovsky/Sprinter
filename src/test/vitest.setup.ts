import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/http";

beforeAll(() => server.listen());

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
