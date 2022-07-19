export default 1;

try {
  await import("./main");
  await import("./ok");
  await import("./the-thing");
  await import("./readme");
  await import("./typed");
  await import("./downstream");
  await import("./sync");
  await import("./push");
  await import("./split");
  await import("./split-fn");
  await import("./walk");
  await import("./iterable-lifecycle");
  await import("./blend");
} catch (error) {
  if (error instanceof AggregateError) {
    console.error(error.errors);
  }
  throw error;
}
