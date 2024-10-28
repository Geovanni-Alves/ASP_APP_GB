import React, { useEffect, useState } from "react";
import { API } from "aws-amplify";
import { updateVan, deleteVan } from "../graphql/mutations";
import { listVans } from "../graphql/queries";
import "./Vans.css";
import VansForm from "./VansForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faTrash,
  faArrowRight,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { Card } from "antd";

function Students() {
  const [vans, setVans] = useState([]);
  const [selectedVan, setSelectedVan] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [modelFilter, setModelFilter] = useState("");
  const [plateFilter, setPlateFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [updatedVanName, setUpdatedVanName] = useState("");
  const [updatedVanPicture, setUpdatedVanPicture] = useState("");
  const [updatedVanPlate, setUpdatedVanPlate] = useState("");
  const [updatedVanModel, setUpdatedVanModel] = useState("");
  const [updatedVanYear, setUpdatedVanYear] = useState("");
  const [updatedVanSeats, setUpdatedVanSeats] = useState("");
  const [updatedVanBosterSeats, setUpdatedVanBosterSeats] = useState("");

  const vansPerPage = 4;

  const fetchVans = async () => {
    try {
      const response = await API.graphql({ query: listVans });
      const vansData = response.data.listVans.items;
      setVans(vansData);
    } catch (error) {
      console.error("Error fetching vans", error);
    }
  };

  useEffect(() => {
    fetchVans();
  }, []);

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => prevPage - 1);
  };

  const startIndex = (currentPage - 1) * vansPerPage;
  const endIndex = startIndex + vansPerPage;

  const filteredVans = vans.filter((van) => {
    return (
      (modelFilter === "" ||
        van.name.toLowerCase().includes(modelFilter.toLowerCase())) &&
      (plateFilter === "" ||
        van.dropOffAddress.toLowerCase().includes(plateFilter.toLowerCase()))
    );
  });

  const displayedVans = filteredVans.slice(startIndex, endIndex);

  const handleVanClick = (van) => {
    setSelectedVan(van);
    setMode("details");
  };

  useEffect(() => {
    if (selectedVan) {
      setUpdatedVanName(selectedVan.name);
      setUpdatedVanPicture(selectedVan.image);
      setUpdatedVanPlate(selectedVan.plate);
      setUpdatedVanModel(selectedVan.model);
      setUpdatedVanYear(selectedVan.year);
      setUpdatedVanSeats(selectedVan.seats);
      setUpdatedVanBosterSeats(selectedVan.bosterSeats);
    }
  }, [selectedVan]);

  const handleDeleteClick = (van) => {
    setSelectedVan(van);
    setMode("delete");
  };

  const handleDeleteVan = async () => {
    if (!selectedVan) {
      return;
    }

    try {
      const nameDeleted = selectedVan.name;
      await API.graphql({
        query: deleteVan,
        variables: { input: { id: selectedVan.id } },
      });
      setSelectedVan(null);
      await fetchVans();
      setMode("list");
      alert(`Van - ${nameDeleted}, successful deleted! `);
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  const handleUpdateVan = async () => {
    if (!selectedVan) {
      return;
    }
    const nameUpdated = selectedVan.name;
    try {
      await API.graphql({
        query: updateVan,
        variables: {
          input: {
            id: selectedVan.id,
            name: updatedVanName,
            image: updatedVanPicture,
            plate: updatedVanPlate,
            model: updatedVanModel,
            year: updatedVanYear,
            seats: updatedVanSeats,
            bosterSeats: updatedVanBosterSeats,
          },
        },
      });
      alert(`Van - ${nameUpdated}, updated successfully!`);

      await fetchVans();
      setSelectedVan(null);
      setMode("list");
      setUpdatedVanName("");
      setUpdatedVanPicture("");
      setUpdatedVanPlate("");
      setUpdatedVanModel("");
      setUpdatedVanYear("");
      setUpdatedVanSeats("");
      setUpdatedVanBosterSeats("");
    } catch (error) {
      console.error("Error updating student:", error);
    }
  };

  const handleVanAdded = async () => {
    try {
      fetchVans();
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };
  const handleBackToList = (e) => {
    e.preventDefault();
    setSelectedVan(null);
    setMode("list");
  };
  return (
    <div className="home-main">
      <div className="home">
        <div className="home-container">
          <div className="van-container">
            {mode === "list" && (
              <div>
                <h3>Vans</h3>
                <div className="filters">
                  <input
                    type="text"
                    placeholder="Filter by Model"
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Filter by Plate"
                    value={plateFilter}
                    onChange={(e) => setPlateFilter(e.target.value)}
                  />
                </div>
                <div className="van">
                  {displayedVans.map((van) => (
                    <div className="van-details-container" key={van.id}>
                      <img src={van.image} className="van-picture" />
                      <div className="van-details">
                        <div className="van-name">{van.name}</div>
                        <div className="van-model">{van.model}</div>
                        <div className="van-plate">{van.plate}</div>
                      </div>
                      <div className="van-details-btn">
                        <button
                          onClick={() => handleVanClick(van)}
                          className="btn btn-van-edit"
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button
                          className="btn btn-van-delete"
                          onClick={() => {
                            handleDeleteClick(van);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pagination">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="btn"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} beat />
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={endIndex >= filteredVans.length}
                    className="btn"
                  >
                    <FontAwesomeIcon icon={faArrowRight} beat />
                  </button>
                </div>
              </div>
            )}
            {mode === "details" && selectedVan && (
              <div className="update-van-container">
                <h2>Update Van</h2>
                <div className="update-van">
                  <h4>{selectedVan.name}</h4>
                  <Card>
                    <label>Name:</label>
                    <input
                      type="text"
                      value={updatedVanName}
                      onChange={(e) => setUpdatedVanName(e.target.value)}
                    />
                    <label>Picture:</label>
                    <input
                      type="text"
                      value={updatedVanPicture}
                      onChange={(e) => setUpdatedVanPicture(e.target.value)}
                    />
                    <label>Plate:</label>
                    <input
                      type="text"
                      value={updatedVanPlate}
                      onChange={(e) => setUpdatedVanPlate(e.target.value)}
                    />
                    <label>Model:</label>
                    <input
                      type="text"
                      value={updatedVanModel}
                      onChange={(e) => setUpdatedVanModel(e.target.value)}
                    />
                    <label>Year:</label>
                    <input
                      type="text"
                      value={updatedVanYear}
                      onChange={(e) => setUpdatedVanYear(e.target.value)}
                    />
                    <label>Seats:</label>
                    <input
                      type="text"
                      value={updatedVanSeats}
                      onChange={(e) => setUpdatedVanSeats(e.target.value)}
                    />
                    <label>Booster Seats:</label>
                    <input
                      type="text"
                      value={updatedVanBosterSeats}
                      onChange={(e) => setUpdatedVanBosterSeats(e.target.value)}
                    />
                    <button onClick={handleUpdateVan} className="btn">
                      Update Van
                    </button>
                    <button onClick={handleBackToList} className="btn">
                      Back to List
                    </button>
                  </Card>
                </div>
              </div>
            )}
            {mode === "delete" && selectedVan && (
              <div className="delete-van-container">
                <h2>Delete Van</h2>
                <div className="delete-van">
                  <h4>{selectedVan.name}</h4>
                  <p>Are you sure you want to delete this van?</p>
                  <button onClick={handleDeleteVan} className="btn">
                    Yes
                  </button>
                  <button onClick={() => setMode("list")} className="btn">
                    No
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="left-container">
            <VansForm onVanAdded={handleVanAdded} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Students;
