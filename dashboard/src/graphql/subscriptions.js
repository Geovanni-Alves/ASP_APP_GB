/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateKidsSchedule = /* GraphQL */ `
  subscription OnCreateKidsSchedule(
    $filter: ModelSubscriptionKidsScheduleFilterInput
  ) {
    onCreateKidsSchedule(filter: $filter) {
      id
      Monday
      Tuesday
      Wednesday
      Thursday
      Friday
      Kid {
        id
        name
        parent1Email
        parent2Email
        dropOffAddress
        lat
        lng
        birthDate
        photo
        Parent1ID
        Parent2ID
        vanID
        routeID
        checkedIn
        lastCheckIn
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      kidsScheduleKidId
      __typename
    }
  }
`;
export const onUpdateKidsSchedule = /* GraphQL */ `
  subscription OnUpdateKidsSchedule(
    $filter: ModelSubscriptionKidsScheduleFilterInput
  ) {
    onUpdateKidsSchedule(filter: $filter) {
      id
      Monday
      Tuesday
      Wednesday
      Thursday
      Friday
      Kid {
        id
        name
        parent1Email
        parent2Email
        dropOffAddress
        lat
        lng
        birthDate
        photo
        Parent1ID
        Parent2ID
        vanID
        routeID
        checkedIn
        lastCheckIn
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      kidsScheduleKidId
      __typename
    }
  }
`;
export const onDeleteKidsSchedule = /* GraphQL */ `
  subscription OnDeleteKidsSchedule(
    $filter: ModelSubscriptionKidsScheduleFilterInput
  ) {
    onDeleteKidsSchedule(filter: $filter) {
      id
      Monday
      Tuesday
      Wednesday
      Thursday
      Friday
      Kid {
        id
        name
        parent1Email
        parent2Email
        dropOffAddress
        lat
        lng
        birthDate
        photo
        Parent1ID
        Parent2ID
        vanID
        routeID
        checkedIn
        lastCheckIn
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      kidsScheduleKidId
      __typename
    }
  }
`;
export const onCreatePictures = /* GraphQL */ `
  subscription OnCreatePictures($filter: ModelSubscriptionPicturesFilterInput) {
    onCreatePictures(filter: $filter) {
      id
      picture
      kidID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdatePictures = /* GraphQL */ `
  subscription OnUpdatePictures($filter: ModelSubscriptionPicturesFilterInput) {
    onUpdatePictures(filter: $filter) {
      id
      picture
      kidID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeletePictures = /* GraphQL */ `
  subscription OnDeletePictures($filter: ModelSubscriptionPicturesFilterInput) {
    onDeletePictures(filter: $filter) {
      id
      picture
      kidID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateEvents = /* GraphQL */ `
  subscription OnCreateEvents($filter: ModelSubscriptionEventsFilterInput) {
    onCreateEvents(filter: $filter) {
      id
      name
      image
      link
      date
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateEvents = /* GraphQL */ `
  subscription OnUpdateEvents($filter: ModelSubscriptionEventsFilterInput) {
    onUpdateEvents(filter: $filter) {
      id
      name
      image
      link
      date
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteEvents = /* GraphQL */ `
  subscription OnDeleteEvents($filter: ModelSubscriptionEventsFilterInput) {
    onDeleteEvents(filter: $filter) {
      id
      name
      image
      link
      date
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateWeekDayRoutes = /* GraphQL */ `
  subscription OnCreateWeekDayRoutes(
    $filter: ModelSubscriptionWeekDayRoutesFilterInput
  ) {
    onCreateWeekDayRoutes(filter: $filter) {
      id
      date
      weekDay
      vanID
      kidID
      Order
      kidName
      kidDropOffAddress
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateWeekDayRoutes = /* GraphQL */ `
  subscription OnUpdateWeekDayRoutes(
    $filter: ModelSubscriptionWeekDayRoutesFilterInput
  ) {
    onUpdateWeekDayRoutes(filter: $filter) {
      id
      date
      weekDay
      vanID
      kidID
      Order
      kidName
      kidDropOffAddress
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteWeekDayRoutes = /* GraphQL */ `
  subscription OnDeleteWeekDayRoutes(
    $filter: ModelSubscriptionWeekDayRoutesFilterInput
  ) {
    onDeleteWeekDayRoutes(filter: $filter) {
      id
      date
      weekDay
      vanID
      kidID
      Order
      kidName
      kidDropOffAddress
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateConfigs = /* GraphQL */ `
  subscription OnCreateConfigs($filter: ModelSubscriptionConfigsFilterInput) {
    onCreateConfigs(filter: $filter) {
      id
      defaultVanPhoto
      defaultUserPhoto
      phoneNumberManager
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateConfigs = /* GraphQL */ `
  subscription OnUpdateConfigs($filter: ModelSubscriptionConfigsFilterInput) {
    onUpdateConfigs(filter: $filter) {
      id
      defaultVanPhoto
      defaultUserPhoto
      phoneNumberManager
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteConfigs = /* GraphQL */ `
  subscription OnDeleteConfigs($filter: ModelSubscriptionConfigsFilterInput) {
    onDeleteConfigs(filter: $filter) {
      id
      defaultVanPhoto
      defaultUserPhoto
      phoneNumberManager
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateAddressList = /* GraphQL */ `
  subscription OnCreateAddressList(
    $filter: ModelSubscriptionAddressListFilterInput
  ) {
    onCreateAddressList(filter: $filter) {
      id
      order
      latitude
      longitude
      routeID
      Kid {
        id
        name
        parent1Email
        parent2Email
        dropOffAddress
        lat
        lng
        birthDate
        photo
        Parent1ID
        Parent2ID
        vanID
        routeID
        checkedIn
        lastCheckIn
        createdAt
        updatedAt
        __typename
      }
      status
      createdAt
      updatedAt
      addressListKidId
      __typename
    }
  }
`;
export const onUpdateAddressList = /* GraphQL */ `
  subscription OnUpdateAddressList(
    $filter: ModelSubscriptionAddressListFilterInput
  ) {
    onUpdateAddressList(filter: $filter) {
      id
      order
      latitude
      longitude
      routeID
      Kid {
        id
        name
        parent1Email
        parent2Email
        dropOffAddress
        lat
        lng
        birthDate
        photo
        Parent1ID
        Parent2ID
        vanID
        routeID
        checkedIn
        lastCheckIn
        createdAt
        updatedAt
        __typename
      }
      status
      createdAt
      updatedAt
      addressListKidId
      __typename
    }
  }
`;
export const onDeleteAddressList = /* GraphQL */ `
  subscription OnDeleteAddressList(
    $filter: ModelSubscriptionAddressListFilterInput
  ) {
    onDeleteAddressList(filter: $filter) {
      id
      order
      latitude
      longitude
      routeID
      Kid {
        id
        name
        parent1Email
        parent2Email
        dropOffAddress
        lat
        lng
        birthDate
        photo
        Parent1ID
        Parent2ID
        vanID
        routeID
        checkedIn
        lastCheckIn
        createdAt
        updatedAt
        __typename
      }
      status
      createdAt
      updatedAt
      addressListKidId
      __typename
    }
  }
`;
export const onCreateVan = /* GraphQL */ `
  subscription OnCreateVan($filter: ModelSubscriptionVanFilterInput) {
    onCreateVan(filter: $filter) {
      id
      name
      image
      plate
      model
      year
      seats
      bosterSeats
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateVan = /* GraphQL */ `
  subscription OnUpdateVan($filter: ModelSubscriptionVanFilterInput) {
    onUpdateVan(filter: $filter) {
      id
      name
      image
      plate
      model
      year
      seats
      bosterSeats
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteVan = /* GraphQL */ `
  subscription OnDeleteVan($filter: ModelSubscriptionVanFilterInput) {
    onDeleteVan(filter: $filter) {
      id
      name
      image
      plate
      model
      year
      seats
      bosterSeats
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateRoute = /* GraphQL */ `
  subscription OnCreateRoute($filter: ModelSubscriptionRouteFilterInput) {
    onCreateRoute(filter: $filter) {
      id
      date
      departTime
      lat
      lng
      driver
      helper
      route
      Van {
        id
        name
        image
        plate
        model
        year
        seats
        bosterSeats
        createdAt
        updatedAt
        __typename
      }
      status
      AddressLists {
        nextToken
        __typename
      }
      Kids {
        nextToken
        __typename
      }
      currentDestination
      finishedTime
      createdAt
      updatedAt
      routeVanId
      __typename
    }
  }
`;
export const onUpdateRoute = /* GraphQL */ `
  subscription OnUpdateRoute($filter: ModelSubscriptionRouteFilterInput) {
    onUpdateRoute(filter: $filter) {
      id
      date
      departTime
      lat
      lng
      driver
      helper
      route
      Van {
        id
        name
        image
        plate
        model
        year
        seats
        bosterSeats
        createdAt
        updatedAt
        __typename
      }
      status
      AddressLists {
        nextToken
        __typename
      }
      Kids {
        nextToken
        __typename
      }
      currentDestination
      finishedTime
      createdAt
      updatedAt
      routeVanId
      __typename
    }
  }
`;
export const onDeleteRoute = /* GraphQL */ `
  subscription OnDeleteRoute($filter: ModelSubscriptionRouteFilterInput) {
    onDeleteRoute(filter: $filter) {
      id
      date
      departTime
      lat
      lng
      driver
      helper
      route
      Van {
        id
        name
        image
        plate
        model
        year
        seats
        bosterSeats
        createdAt
        updatedAt
        __typename
      }
      status
      AddressLists {
        nextToken
        __typename
      }
      Kids {
        nextToken
        __typename
      }
      currentDestination
      finishedTime
      createdAt
      updatedAt
      routeVanId
      __typename
    }
  }
`;
export const onCreateKid = /* GraphQL */ `
  subscription OnCreateKid($filter: ModelSubscriptionKidFilterInput) {
    onCreateKid(filter: $filter) {
      id
      name
      parent1Email
      parent2Email
      dropOffAddress
      lat
      lng
      birthDate
      photo
      Parent1ID
      Parent2ID
      vanID
      routeID
      checkedIn
      lastCheckIn
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateKid = /* GraphQL */ `
  subscription OnUpdateKid($filter: ModelSubscriptionKidFilterInput) {
    onUpdateKid(filter: $filter) {
      id
      name
      parent1Email
      parent2Email
      dropOffAddress
      lat
      lng
      birthDate
      photo
      Parent1ID
      Parent2ID
      vanID
      routeID
      checkedIn
      lastCheckIn
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteKid = /* GraphQL */ `
  subscription OnDeleteKid($filter: ModelSubscriptionKidFilterInput) {
    onDeleteKid(filter: $filter) {
      id
      name
      parent1Email
      parent2Email
      dropOffAddress
      lat
      lng
      birthDate
      photo
      Parent1ID
      Parent2ID
      vanID
      routeID
      checkedIn
      lastCheckIn
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateUser = /* GraphQL */ `
  subscription OnCreateUser($filter: ModelSubscriptionUserFilterInput) {
    onCreateUser(filter: $filter) {
      id
      sub
      name
      email
      unitNumber
      address
      lng
      lat
      phoneNumber
      userType
      photo
      pushToken
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateUser = /* GraphQL */ `
  subscription OnUpdateUser($filter: ModelSubscriptionUserFilterInput) {
    onUpdateUser(filter: $filter) {
      id
      sub
      name
      email
      unitNumber
      address
      lng
      lat
      phoneNumber
      userType
      photo
      pushToken
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteUser = /* GraphQL */ `
  subscription OnDeleteUser($filter: ModelSubscriptionUserFilterInput) {
    onDeleteUser(filter: $filter) {
      id
      sub
      name
      email
      unitNumber
      address
      lng
      lat
      phoneNumber
      userType
      photo
      pushToken
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateMessage = /* GraphQL */ `
  subscription OnCreateMessage($filter: ModelSubscriptionMessageFilterInput) {
    onCreateMessage(filter: $filter) {
      id
      senderID
      receiverIDs
      content
      sentAt
      isRead
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateMessage = /* GraphQL */ `
  subscription OnUpdateMessage($filter: ModelSubscriptionMessageFilterInput) {
    onUpdateMessage(filter: $filter) {
      id
      senderID
      receiverIDs
      content
      sentAt
      isRead
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteMessage = /* GraphQL */ `
  subscription OnDeleteMessage($filter: ModelSubscriptionMessageFilterInput) {
    onDeleteMessage(filter: $filter) {
      id
      senderID
      receiverIDs
      content
      sentAt
      isRead
      createdAt
      updatedAt
      __typename
    }
  }
`;
