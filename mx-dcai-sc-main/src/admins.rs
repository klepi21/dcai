use errors::ERROR_NOT_ADMIN;
use multiversx_sc::imports::*;

/// Smart Contract module that offers admin management capabilities.
///
/// It provides:
/// * two endpoints where the owner can add/remove admins
/// * a view to check if an address is an admin
/// * a view to get the list of admins
/// * a method to require an address to be an admin
#[multiversx_sc::module]
pub trait AdminsModule {
    // === Endpoints ===

    /// Adds new admin addresses.
    ///
    /// Only the contract owner can call this endpoint.
    ///
    /// ### Arguments
    /// * `addresses` - A list of addresses to add as admins.
    #[only_owner]
    #[endpoint(addAdmins)]
    fn add_admins(&self, addresses: MultiValueEncoded<ManagedAddress>) {
        self.event_admins_added(&addresses);

        for address in addresses.into_iter() {
            self.admins().insert(address);
        }
    }

    /// Removes admin addresses.
    ///
    /// Only the contract owner can call this endpoint.
    ///
    /// ### Arguments
    /// * `addresses` - A list of addresses to remove from admins.
    #[only_owner]
    #[endpoint(removeAdmins)]
    fn remove_admins(&self, addresses: MultiValueEncoded<ManagedAddress>) {
        self.event_admins_removed(&addresses);

        for address in addresses.into_iter() {
            self.admins().swap_remove(&address);
        }
    }

    // === Views ===

    /// Checks if an address is an admin.
    ///
    /// ### Arguments
    /// * `address` - The address to check.
    ///
    /// ### Returns
    /// `true` if the address is an admin, `false` otherwise.
    #[view(isAdmin)]
    fn is_admin(&self, address: &ManagedAddress) -> bool {
        self.admins().contains(address)
    }

    // === Private ===

    /// Requires the given address to be an admin, otherwise fails.
    fn require_is_admin(&self, address: &ManagedAddress) {
        require!(self.is_admin(address), ERROR_NOT_ADMIN);
    }

    // === Storage ===

    /// Storage mapper for the set of admin addresses.
    #[view(getAdmins)]
    #[storage_mapper("admins")]
    fn admins(&self) -> UnorderedSetMapper<ManagedAddress>;

    // === Events ===

    #[event("adminsAdded")]
    fn event_admins_added(&self, #[indexed] admins: &MultiValueEncoded<ManagedAddress>);

    #[event("adminsRemoved")]
    fn event_admins_removed(&self, #[indexed] admins: &MultiValueEncoded<ManagedAddress>);
}
