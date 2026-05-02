export function getUsersModel(prisma: any) {
  return prisma?.users ?? prisma?.user ?? null
}

export function getEventSponsorsModel(prisma: any) {
  return prisma?.event_sponsors ?? prisma?.eventSponsor ?? null
}

export function getSponsorCompaniesModel(prisma: any) {
  return prisma?.sponsor_companies ?? prisma?.sponsorCompany ?? null
}

export function getEventDivisionMembersModel(prisma: any) {
  return prisma?.event_division_members ?? prisma?.division_assignments ?? null
}
