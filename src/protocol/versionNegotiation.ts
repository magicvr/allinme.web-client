const versionPattern = /^[0-9]+\.[0-9]+$/
const capabilityPattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*$/

export interface PageMeta {
  protocolVersion?: unknown
  requiredCapabilities?: unknown
}

export interface RendererSupport {
  supportedVersions?: unknown
  supportedCapabilities?: unknown
}

export interface NegotiationResult {
  accepted: boolean
  code: string
  pageVersion: string | null
  supportedVersions: unknown[]
  missingCapabilities: string[]
}

function isUniqueStringList(value: unknown, pattern: RegExp, allowEmpty: boolean): value is string[] {
  return Array.isArray(value)
    && (allowEmpty || value.length > 0)
    && value.every((item) => typeof item === 'string' && pattern.test(item))
    && new Set(value).size === value.length
}

function result(
  accepted: boolean,
  code: string,
  pageVersion: string | null,
  supportedVersions: unknown[],
  missingCapabilities: string[] = [],
): NegotiationResult {
  return { accepted, code, pageVersion, supportedVersions, missingCapabilities }
}

export function negotiateProtocol(
  pageMeta: PageMeta | null | undefined,
  rendererSupport: RendererSupport | null | undefined,
): NegotiationResult {
  const pageVersion = typeof pageMeta?.protocolVersion === 'string' ? pageMeta.protocolVersion : null
  const supportedVersions = Array.isArray(rendererSupport?.supportedVersions)
    ? [...rendererSupport.supportedVersions]
    : []

  if (pageVersion === null) {
    return result(false, 'MISSING_PROTOCOL_VERSION', null, supportedVersions)
  }
  if (!versionPattern.test(pageVersion)) {
    return result(false, 'INVALID_PROTOCOL_VERSION', pageVersion, supportedVersions)
  }
  if (!isUniqueStringList(rendererSupport?.supportedVersions, versionPattern, false)) {
    return result(false, 'INVALID_RENDERER_SUPPORT', pageVersion, supportedVersions)
  }
  if (!supportedVersions.includes(pageVersion)) {
    return result(false, 'UNSUPPORTED_PROTOCOL_VERSION', pageVersion, supportedVersions)
  }

  const requiredCapabilities = pageMeta?.requiredCapabilities ?? []
  if (!isUniqueStringList(requiredCapabilities, capabilityPattern, true)) {
    return result(false, 'INVALID_REQUIRED_CAPABILITIES', pageVersion, supportedVersions)
  }

  const supportedCapabilities = rendererSupport?.supportedCapabilities ?? []
  if (!isUniqueStringList(supportedCapabilities, capabilityPattern, true)) {
    return result(false, 'INVALID_RENDERER_SUPPORT', pageVersion, supportedVersions)
  }

  const supportedCapabilitySet = new Set(supportedCapabilities)
  const missingCapabilities = requiredCapabilities.filter(
    (capability) => !supportedCapabilitySet.has(capability),
  )
  if (missingCapabilities.length > 0) {
    return result(false, 'MISSING_REQUIRED_CAPABILITY', pageVersion, supportedVersions, missingCapabilities)
  }

  return result(true, 'OK', pageVersion, supportedVersions)
}