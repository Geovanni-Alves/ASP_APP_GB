/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createKidsSchedule = /* GraphQL */ `
  mutation CreateKidsSchedule(
    $input: CreateKidsScheduleInput!
    $condition: ModelKidsScheduleConditionInput
  ) {
    createKidsSchedule(input: $input, condition: $condition) {
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
export const updateKidsSchedule = /* GraphQL */ `
  mutation UpdateKidsSchedule(
    $input: UpdateKidsScheduleInput!
    $condition: ModelKidsScheduleConditionInput
  ) {
    updateKidsSchedule(input: $input, condition: $condition) {
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
export const deleteKidsSchedule = /* GraphQL */ `
  mutation DeleteKidsSchedule(
    $input: DeleteKidsScheduleInput!
    $condition: ModelKidsScheduleConditionInput
  ) {
    deleteKidsSchedule(input: $input, condition: $condition) {
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
export const createPictures = /* GraphQL */ `
  mutation CreatePictures(
    $input: CreatePicturesInput!
    $condition: ModelPicturesConditionInput
  ) {
    createPictures(input: $input, condition: $condition) {
      id
      picture
      kidID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updatePictures = /* GraphQL */ `
  mutation UpdatePictures(
    $input: UpdatePicturesInput!
    $condition: ModelPicturesConditionInput
  ) {
    updatePictures(input: $input, condition: $condition) {
      id
      picture
      kidID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deletePictures = /* GraphQL */ `
  mutation DeletePictures(
    $input: DeletePicturesInput!
    $condition: ModelPicturesConditionInput
  ) {
    deletePictures(input: $input, condition: $condition) {
      id
      picture
      kidID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createEvents = /* GraphQL */ `
  mutation CreateEvents(
    $input: CreateEventsInput!
    $condition: ModelEventsConditionInput
  ) {
    createEvents(input: $input, condition: $condition) {
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
export const updateEvents = /* GraphQL */ `
  mutation UpdateEvents(
    $input: UpdateEventsInput!
    $condition: ModelEventsConditionInput
  ) {
    updateEvents(input: $input, condition: $condition) {
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
export const deleteEvents = /* GraphQL */ `
  mutation DeleteEvents(
    $input: DeleteEventsInput!
    $condition: ModelEventsConditionInput
  ) {
    deleteEvents(input: $input, condition: $condition) {
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
export const createWeekDayRoutes = /* GraphQL */ `
  mutation CreateWeekDayRoutes(
    $input: CreateWeekDayRoutesInput!
    $condition: ModelWeekDayRoutesConditionInput
  ) {
    createWeekDayRoutes(input: $input, condition: $condition) {
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
export const updateWeekDayRoutes = /* GraphQL */ `
  mutation UpdateWeekDayRoutes(
    $input: UpdateWeekDayRoutesInput!
    $condition: ModelWeekDayRoutesConditionInput
  ) {
    updateWeekDayRoutes(input: $input, condition: $condition) {
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
export const deleteWeekDayRoutes = /* GraphQL */ `
  mutation DeleteWeekDayRoutes(
    $input: DeleteWeekDayRoutesInput!
    $condition: ModelWeekDayRoutesConditionInput
  ) {
    deleteWeekDayRoutes(input: $input, condition: $condition) {
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
export const createConfigs = /* GraphQL */ `
  mutation CreateConfigs(
    $input: CreateConfigsInput!
    $condition: ModelConfigsConditionInput
  ) {
    createConfigs(input: $input, condition: $condition) {
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
export const updateConfigs = /* GraphQL */ `
  mutation UpdateConfigs(
    $input: UpdateConfigsInput!
    $condition: ModelConfigsConditionInput
  ) {
    updateConfigs(input: $input, condition: $condition) {
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
export const deleteConfigs = /* GraphQL */ `
  mutation DeleteConfigs(
    $input: DeleteConfigsInput!
    $condition: ModelConfigsConditionInput
  ) {
    deleteConfigs(input: $input, condition: $condition) {
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
export const createAddressList = /* GraphQL */ `
  mutation CreateAddressList(
    $input: CreateAddressListInput!
    $condition: ModelAddressListConditionInput
  ) {
    createAddressList(input: $input, condition: $condition) {
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
export const updateAddressList = /* GraphQL */ `
  mutation UpdateAddressList(
    $input: UpdateAddressListInput!
    $condition: ModelAddressListConditionInput
  ) {
    updateAddressList(input: $input, condition: $condition) {
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
export const deleteAddressList = /* GraphQL */ `
  mutation DeleteAddressList(
    $input: DeleteAddressListInput!
    $condition: ModelAddressListConditionInput
  ) {
    deleteAddressList(input: $input, condition: $condition) {
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
export const createVan = /* GraphQL */ `
  mutation CreateVan(
    $input: CreateVanInput!
    $condition: ModelVanConditionInput
  ) {
    createVan(input: $input, condition: $condition) {
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
export const updateVan = /* GraphQL */ `
  mutation UpdateVan(
    $input: UpdateVanInput!
    $condition: ModelVanConditionInput
  ) {
    updateVan(input: $input, condition: $condition) {
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
export const deleteVan = /* GraphQL */ `
  mutation DeleteVan(
    $input: DeleteVanInput!
    $condition: ModelVanConditionInput
  ) {
    deleteVan(input: $input, condition: $condition) {
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
export const createRoute = /* GraphQL */ `
  mutation CreateRoute(
    $input: CreateRouteInput!
    $condition: ModelRouteConditionInput
  ) {
    createRoute(input: $input, condition: $condition) {
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
export const updateRoute = /* GraphQL */ `
  mutation UpdateRoute(
    $input: UpdateRouteInput!
    $condition: ModelRouteConditionInput
  ) {
    updateRoute(input: $input, condition: $condition) {
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
export const deleteRoute = /* GraphQL */ `
  mutation DeleteRoute(
    $input: DeleteRouteInput!
    $condition: ModelRouteConditionInput
  ) {
    deleteRoute(input: $input, condition: $condition) {
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
export const createKid = /* GraphQL */ `
  mutation CreateKid(
    $input: CreateKidInput!
    $condition: ModelKidConditionInput
  ) {
    createKid(input: $input, condition: $condition) {
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
export const updateKid = /* GraphQL */ `
  mutation UpdateKid(
    $input: UpdateKidInput!
    $condition: ModelKidConditionInput
  ) {
    updateKid(input: $input, condition: $condition) {
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
export const deleteKid = /* GraphQL */ `
  mutation DeleteKid(
    $input: DeleteKidInput!
    $condition: ModelKidConditionInput
  ) {
    deleteKid(input: $input, condition: $condition) {
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
export const createUser = /* GraphQL */ `
  mutation CreateUser(
    $input: CreateUserInput!
    $condition: ModelUserConditionInput
  ) {
    createUser(input: $input, condition: $condition) {
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
export const updateUser = /* GraphQL */ `
  mutation UpdateUser(
    $input: UpdateUserInput!
    $condition: ModelUserConditionInput
  ) {
    updateUser(input: $input, condition: $condition) {
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
export const deleteUser = /* GraphQL */ `
  mutation DeleteUser(
    $input: DeleteUserInput!
    $condition: ModelUserConditionInput
  ) {
    deleteUser(input: $input, condition: $condition) {
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
export const createMessage = /* GraphQL */ `
  mutation CreateMessage(
    $input: CreateMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    createMessage(input: $input, condition: $condition) {
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
export const updateMessage = /* GraphQL */ `
  mutation UpdateMessage(
    $input: UpdateMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    updateMessage(input: $input, condition: $condition) {
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
export const deleteMessage = /* GraphQL */ `
  mutation DeleteMessage(
    $input: DeleteMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    deleteMessage(input: $input, condition: $condition) {
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
