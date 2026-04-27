export function maskEmail(value) {
  const email = String(value || '').trim()

  if (!email) {
    return ''
  }

  const atIndex = email.indexOf('@')
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return email
  }

  const localPart = email.slice(0, atIndex)
  const domainPart = email.slice(atIndex + 1)
  const maskedLocal = localPart.length <= 2
    ? `${localPart[0]}*`
    : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 1))}`

  const domainSections = domainPart.split('.')
  const domainName = domainSections[0] || ''
  const tld = domainSections.slice(1).join('.')

  const maskedDomainName = domainName.length <= 1
    ? '*'
    : `${domainName[0]}${'*'.repeat(Math.max(domainName.length - 1, 1))}`

  return tld
    ? `${maskedLocal}@${maskedDomainName}.${tld}`
    : `${maskedLocal}@${maskedDomainName}`
}

export function maskPhone(value) {
  const source = String(value || '').trim()

  if (!source) {
    return ''
  }

  const digits = source.replace(/\D/g, '')
  if (!digits) {
    return source
  }

  const visibleDigits = digits.slice(-3)
  const hiddenDigitsCount = Math.max(digits.length - 3, 0)
  const hiddenDigits = '*'.repeat(hiddenDigitsCount)

  return `${hiddenDigits}${visibleDigits}`
}
