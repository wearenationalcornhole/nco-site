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

export function getStoreOrdersModel(prisma: any) {
  return prisma?.store_orders ?? prisma?.storeOrders ?? null
}

export function getStoreOrderItemsModel(prisma: any) {
  return prisma?.store_order_items ?? prisma?.storeOrderItems ?? null
}

export function getEventRegistrationPaymentsModel(prisma: any) {
  return prisma?.event_registration_payments ?? prisma?.eventRegistrationPayments ?? null
}
