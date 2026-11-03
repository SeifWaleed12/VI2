import type { AuthenticationInput, AuthenticationResponse, AuthIdentityDTO, AuthIdentityProviderService, EmailPassAuthProviderOptions, IAuthProvider, Logger } from "@medusajs/framework/types"
import EmailPassProvider from "@medusajs/medusa/auth-emailpass"
import { CREDENTIAL_CLAIM, credentialStamp } from "../../lib/security-session"

type Options = EmailPassAuthProviderOptions & { credentialStampSecret: string }
const NativeEmailpass = EmailPassProvider.services[0] as new (dependencies: { logger: Logger }, options: EmailPassAuthProviderOptions) => IAuthProvider

// Extend native password handling only to retain the exact credential snapshot
// it verified/wrote. A later database read could observe a recovery instead.
export default class SecureEmailpassService extends NativeEmailpass {
  static identifier = "emailpass"
  private readonly stampSecret: string
  constructor(dependencies: { logger: Logger }, options: Options) {
    super(dependencies, options)
    this.stampSecret = options.credentialStampSecret
  }

  private async stamped(service: AuthIdentityProviderService, work: (tracked: AuthIdentityProviderService) => Promise<AuthenticationResponse>) {
    let stamp: string | undefined
    const capture = (identity: AuthIdentityDTO) => {
      const hash = identity.provider_identities?.find(provider => provider.provider === "emailpass")?.provider_metadata?.password
      stamp = typeof hash === "string" ? credentialStamp(hash, this.stampSecret) : undefined
      return identity
    }
    const tracked: AuthIdentityProviderService = {
      ...service,
      retrieve: async selector => capture(await service.retrieve(selector)),
      create: async data => capture(await service.create(data)),
      update: async (id, data) => capture(await service.update(id, data)),
    }
    const result = await work(tracked)
    if (result.success && result.authIdentity && stamp) {
      result.authIdentity.app_metadata = { ...result.authIdentity.app_metadata, [CREDENTIAL_CLAIM]: stamp }
    }
    return result
  }

  override authenticate(input: AuthenticationInput, service: AuthIdentityProviderService) {
    return this.stamped(service, tracked => super.authenticate(input, tracked))
  }
  override register(input: AuthenticationInput, service: AuthIdentityProviderService) {
    return this.stamped(service, tracked => super.register(input, tracked))
  }
}
