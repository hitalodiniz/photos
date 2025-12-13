"use client";

export default function Filters({
  filterName,
  filterLocation,
  filterDate,
  setFilterName,
  setFilterLocation,
  setFilterDate,
  resetFilters,
}) {
  return (
    <div className="bg-white p-2 mb-4 flex flex-wrap gap-2 items-center">
      <input
        placeholder="Nome/Cliente/Título..."
        value={filterName}
        onChange={(e) => setFilterName(e.target.value)}
        className="bg-[#F8FAFD] border text-sm rounded-lg px-3 py-1.5 flex-1"
      />

      <input
        placeholder="Local..."
        value={filterLocation}
        onChange={(e) => setFilterLocation(e.target.value)}
        className="bg-[#F8FAFD] border text-sm rounded-lg px-3 py-1.5 flex-1"
      />

      <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        className="bg-[#F8FAFD] border text-sm rounded-lg px-3 py-1.5"
      />

      <button
        onClick={resetFilters}
        className="px-4 py-1.5 bg-[#E9EEF6] rounded-full ml-auto"
      >
        Limpar
      </button>
    </div>
  );
}
