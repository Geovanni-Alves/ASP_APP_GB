import { useMemo, useState, useEffect } from "react";
import { API, graphqlOperation } from "aws-amplify";
import {
  GoogleMap,
  useLoadScript,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import "./VansMaps.css";
import gbIcon from "../docs/gb-logo.svg";
import houseIcon from "../docs/icon-house.png";
import vanIcon from "../docs/van.png";
import { listAddressLists, listRoutes } from "../graphql/queries";
export default function VansMaps() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLEMAPS_APIKEY,
  });
  if (!isLoaded) return <div>Loading...</div>;
  return <Map />;
}

function Map() {
  const center = useMemo(() => ({ lat: 49.26329, lng: -123.10081 }), []);
  const markerOptions = {
    icon: {
      url: gbIcon,
      scaledSize: new window.google.maps.Size(50, 50),
      origin: new window.google.maps.Point(0, 0),
      anchor: new window.google.maps.Point(20, 40),
    },
  };
  const houseMarker = {
    icon: {
      url: houseIcon,
      scaledSize: new window.google.maps.Size(30, 30),
      origin: new window.google.maps.Point(0, 0),
      anchor: new window.google.maps.Point(20, 40),
    },
  };
  const vanMarker = {
    icon: {
      url: vanIcon,
      scaledSize: new window.google.maps.Size(40, 40),
      origin: new window.google.maps.Point(0, 0),
      anchor: new window.google.maps.Point(20, 40),
    },
  };
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const [showStudentMarkers, setShowStudentMarkers] = useState(false);
  const [studentAddresses, setStudentAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [routeMarkers, setRouteMarkers] = useState([]);
  const [showVansMarkers, setShowVansMarkers] = useState(false);
  const toggleInfoWindow = () => {
    setInfoWindowOpen(!infoWindowOpen);
  };
  const toggleStudentMarkers = () => {
    setShowStudentMarkers(!showStudentMarkers);
  };
  const toggleVansMarkers = () => {
    setShowVansMarkers(!showVansMarkers);
  };
  useEffect(() => {
    const fetchAdresses = async () => {
      try {
        const response = await API.graphql(
          graphqlOperation(listAddressLists, { limit: 100 })
        );
        const adressesData = response.data.listAddressLists.items;
        setStudentAddresses(adressesData);
      } catch (error) {
        console.error("Error fetching vans:", error);
      }
    };
    fetchAdresses();
  }, []);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await API.graphql(
          graphqlOperation(listRoutes, {
            filter: { status: { eq: "IN_PROGRESS" } },
            limit: 100,
          })
        );
        const routesData = response.data.listRoutes.items;
        setRouteMarkers(routesData);
      } catch (error) {
        console.error("Error fetching routes:", error);
      }
    };
    fetchRoutes();
  }, []);
  return (
    <div className="google-map-container">
      <GoogleMap
        zoom={12}
        center={center}
        mapContainerClassName="map-container"
      >
        <MarkerF
          position={center}
          options={markerOptions}
          onClick={toggleInfoWindow}
        />
        {showStudentMarkers &&
          Array.isArray(studentAddresses) &&
          studentAddresses.map((address) => (
            <MarkerF
              key={address.id}
              position={{ lat: address.latitude, lng: address.longitude }}
              options={houseMarker}
              onClick={() => {
                setSelectedAddress(address);
                toggleInfoWindow();
              }}
            />
          ))}
        {showVansMarkers &&
          routeMarkers.map((route) => (
            <MarkerF
              key={route.id}
              position={{ lat: route.lat, lng: route.lng }}
              options={vanMarker}
              onClick={() => {
                setSelectedAddress(route);
                toggleInfoWindow();
              }}
            />
          ))}

        {infoWindowOpen && selectedAddress && (
          <InfoWindowF
            position={{
              lat: selectedAddress.latitude,
              lng: selectedAddress.longitude,
            }}
            onCloseClick={toggleInfoWindow}
          >
            <div>
              <h3>Address Details</h3>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
      <div className="check-box">
        <form action="">
          <label className="form-control">
            <input
              type="checkbox"
              name="address-checkbox"
              onClick={toggleStudentMarkers}
            />
            <div className="check-name">Address</div>
          </label>
          <label className="form-control">
            <input
              type="checkbox"
              name="vans-checkbox"
              onClick={toggleVansMarkers}
            />
            <div className="check-name">Vans</div>
          </label>
        </form>
      </div>
    </div>
  );
}
