import React, { useState, useEffect } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { DataStore } from "@aws-amplify/datastore";
import { listVans, listKids } from "../graphql/queries";
import { Kid, Van } from "../models";

const AddStudentToVan = () => {
  const [selectedVanId, setSelectedVanId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [vans, setVans] = useState([]);
  const [kids, setKids] = useState([]);

  useEffect(() => {
    // Fetch the list of vans and kids
    const fetchData = async () => {
      try {
        const [vansData, kidsData] = await Promise.all([
          API.graphql(graphqlOperation(listVans)),
          API.graphql(graphqlOperation(listKids)),
        ]);
        setVans(vansData.data.listVans.items);
        setKids(kidsData.data.listKids.items);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const handleUpdateVanKids = async () => {
    try {
      if (!selectedVanId || !selectedStudentId) {
        console.error("Please select a van and a student.");
        return;
      }

      console.log("Selected Van ID:", selectedVanId);
      console.log("Selected Student ID:", selectedStudentId);

      const selectedVan = await DataStore.query(Van, selectedVanId);
      const selectedStudent = await DataStore.query(Kid, selectedStudentId);

      console.log("Selected Van:", selectedVan);
      console.log("Selected Student:", selectedStudent);

      if (!selectedVan || !selectedStudent) {
        console.error("Selected van or student not found.");
        return;
      }

      // ...rest of your code
    } catch (error) {
      console.error("Error updating van's kids:", error);
    }
  };

  return (
    <div>
      <h2>Add Student to Van</h2>
      <form>
        <div>
          <label>Student Name:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">Select a Student</option>
            {kids.map((kid) => (
              <option key={kid.id} value={kid.id}>
                {kid.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Select Van:</label>
          <select
            value={selectedVanId}
            onChange={(e) => setSelectedVanId(e.target.value)}
          >
            <option value="">Select a van</option>
            {vans.map((van) => (
              <option key={van.id} value={van.id}>
                {van.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={handleUpdateVanKids}>
          Add Student to Van
        </button>
      </form>
    </div>
  );
};

export default AddStudentToVan;
