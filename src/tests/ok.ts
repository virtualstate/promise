import { ok } from "../like";

{
  let caught;
  try {
    ok(false);
  } catch (reason) {
    caught = reason;
  }
  ok(caught);
}
