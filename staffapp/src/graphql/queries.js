/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getFeed = /* GraphQL */ `
  query GetFeed($id: ID!) {
    getFeed(id: $id) {
      id
      type
      dateTime
      userID
      photoName
      text
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listFeeds = /* GraphQL */ `
  query ListFeeds(
    $filter: ModelFeedFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listFeeds(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        type
        dateTime
        userID
        photoName
        text
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getCheckInOut = /* GraphQL */ `
  query GetCheckInOut($id: ID!) {
    getCheckInOut(id: $id) {
      id
      state
      userIdState
      dateState
      TimeState
      kidID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listCheckInOuts = /* GraphQL */ `
  query ListCheckInOuts(
    $filter: ModelCheckInOutFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listCheckInOuts(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        state
        userIdState
        dateState
        TimeState
        kidID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const checkInOutsByKidID = /* GraphQL */ `
  query CheckInOutsByKidID(
    $kidID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelCheckInOutFilterInput
    $limit: Int
    $nextToken: String
  ) {
    checkInOutsByKidID(
      kidID: $kidID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        state
        userIdState
        dateState
        TimeState
        kidID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getKidsSchedule = /* GraphQL */ `
  query GetKidsSchedule($id: ID!) {
    getKidsSchedule(id: $id) {
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
        currentStateId
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
export const listKidsSchedules = /* GraphQL */ `
  query ListKidsSchedules(
    $filter: ModelKidsScheduleFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listKidsSchedules(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        Monday
        Tuesday
        Wednesday
        Thursday
        Friday
        createdAt
        updatedAt
        kidsScheduleKidId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getPictures = /* GraphQL */ `
  query GetPictures($id: ID!) {
    getPictures(id: $id) {
      id
      picture
      kidID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listPictures = /* GraphQL */ `
  query ListPictures(
    $filter: ModelPicturesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listPictures(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        picture
        kidID
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getEvents = /* GraphQL */ `
  query GetEvents($id: ID!) {
    getEvents(id: $id) {
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
export const listEvents = /* GraphQL */ `
  query ListEvents(
    $filter: ModelEventsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        image
        link
        date
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getWeekDayRoutes = /* GraphQL */ `
  query GetWeekDayRoutes($id: ID!) {
    getWeekDayRoutes(id: $id) {
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
export const listWeekDayRoutes = /* GraphQL */ `
  query ListWeekDayRoutes(
    $filter: ModelWeekDayRoutesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listWeekDayRoutes(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      __typename
    }
  }
`;
export const getConfigs = /* GraphQL */ `
  query GetConfigs($id: ID!) {
    getConfigs(id: $id) {
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
export const listConfigs = /* GraphQL */ `
  query ListConfigs(
    $filter: ModelConfigsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listConfigs(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        defaultVanPhoto
        defaultUserPhoto
        phoneNumberManager
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getAddressList = /* GraphQL */ `
  query GetAddressList($id: ID!) {
    getAddressList(id: $id) {
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
        currentStateId
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
export const listAddressLists = /* GraphQL */ `
  query ListAddressLists(
    $filter: ModelAddressListFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listAddressLists(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        order
        latitude
        longitude
        routeID
        status
        createdAt
        updatedAt
        addressListKidId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const addressListsByRouteID = /* GraphQL */ `
  query AddressListsByRouteID(
    $routeID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelAddressListFilterInput
    $limit: Int
    $nextToken: String
  ) {
    addressListsByRouteID(
      routeID: $routeID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        order
        latitude
        longitude
        routeID
        status
        createdAt
        updatedAt
        addressListKidId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getVan = /* GraphQL */ `
  query GetVan($id: ID!) {
    getVan(id: $id) {
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
export const listVans = /* GraphQL */ `
  query ListVans(
    $filter: ModelVanFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listVans(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      __typename
    }
  }
`;
export const getRoute = /* GraphQL */ `
  query GetRoute($id: ID!) {
    getRoute(id: $id) {
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
export const listRoutes = /* GraphQL */ `
  query ListRoutes(
    $filter: ModelRouteFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listRoutes(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        date
        departTime
        lat
        lng
        driver
        helper
        route
        status
        currentDestination
        finishedTime
        createdAt
        updatedAt
        routeVanId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getKid = /* GraphQL */ `
  query GetKid($id: ID!) {
    getKid(id: $id) {
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
      currentStateId
      CheckInOuts {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listKids = /* GraphQL */ `
  query ListKids(
    $filter: ModelKidFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listKids(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
        currentStateId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const kidsByRouteID = /* GraphQL */ `
  query KidsByRouteID(
    $routeID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelKidFilterInput
    $limit: Int
    $nextToken: String
  ) {
    kidsByRouteID(
      routeID: $routeID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        currentStateId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getUser = /* GraphQL */ `
  query GetUser($id: ID!) {
    getUser(id: $id) {
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
export const listUsers = /* GraphQL */ `
  query ListUsers(
    $filter: ModelUserFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      __typename
    }
  }
`;
export const getMessage = /* GraphQL */ `
  query GetMessage($id: ID!) {
    getMessage(id: $id) {
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
export const listMessages = /* GraphQL */ `
  query ListMessages(
    $filter: ModelMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      __typename
    }
  }
`;
