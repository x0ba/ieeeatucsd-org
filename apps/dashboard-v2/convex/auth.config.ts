export default {
  providers: [
    {
      type: "customJwt" as const,
      applicationID: "g6ioeymir031w2hep4two",
      issuer: "https://auth.ieeeatucsd.org/oidc",
      jwks: "https://auth.ieeeatucsd.org/oidc/jwks",
      algorithm: "RS256" as const,
    },
  ],
};
