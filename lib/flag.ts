export const flags = {
  enableStructure:
    process.env.NODE_ENV !== "production"
      ? true
      : (process.env.NEXT_PUBLIC_ENABLE_STRUCTURE === "true"),
};
