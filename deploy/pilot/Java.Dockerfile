# Caller MUST supply an immutable, verified Temurin 17 JDK Ubuntu image digest.
ARG JAVA_BASE
FROM ${JAVA_BASE}
RUN test -x /usr/bin/timeout && test -x /usr/bin/sleep && java -version && javac -version
WORKDIR /work
# Runtime additionally overrides user, mounts, network, capabilities and cgroups.
USER 65534:65534
ENTRYPOINT []
CMD ["java", "-version"]
