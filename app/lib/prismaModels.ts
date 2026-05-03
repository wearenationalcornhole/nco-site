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

export function getStoreProductsModel(prisma: any) {
  return prisma?.store_products ?? prisma?.storeProducts ?? null
}

export function getStoreProductImagesModel(prisma: any) {
  return prisma?.store_product_images ?? prisma?.storeProductImages ?? null
}

export function getEventRegistrationPaymentsModel(prisma: any) {
  return prisma?.event_registration_payments ?? prisma?.eventRegistrationPayments ?? null
}

export function getPaymentActionAuditLogsModel(prisma: any) {
  return prisma?.payment_action_audit_logs ?? prisma?.paymentActionAuditLogs ?? null
}

export function getWebhookDeliveryLogsModel(prisma: any) {
  return prisma?.webhook_delivery_logs ?? prisma?.webhookDeliveryLogs ?? null
}
