const ROWS = [
  { id: 1, name: 'Dupont & Fils',         email: 'contact@dupont.fr',          status: 'Active',   since: 'Jan 2024' },
  { id: 2, name: 'Boulangerie Martin',     email: 'martin@boulangerie.be',      status: 'Active',   since: 'Mar 2024' },
  { id: 3, name: 'Tech Innov SA',          email: 'info@techinnov.eu',          status: 'Inactive', since: 'Nov 2023' },
  { id: 4, name: 'Restaurant Le Sud',      email: 'lesud@resto.fr',             status: 'Active',   since: 'Feb 2024' },
  { id: 5, name: 'Garage Peugeot Nord',    email: 'contact@peugeot-nord.fr',    status: 'Active',   since: 'Apr 2024' },
  { id: 6, name: 'Électricité Durand',     email: 'durand@electricite.be',      status: 'Active',   since: 'May 2024' },
  { id: 7, name: 'Librairie des Flandres', email: 'librairie@flandres.fr',      status: 'Inactive', since: 'Oct 2023' },
];

export default function Customers() {
  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-semibold mb-1">Customers</h4>
          <p className="text-muted mb-0">{ROWS.length} customers total</p>
        </div>
        <button className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-1" /> Add customer
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3 border-0 fw-medium text-muted small">Name</th>
                <th className="py-3 border-0 fw-medium text-muted small">Email</th>
                <th className="py-3 border-0 fw-medium text-muted small">Status</th>
                <th className="py-3 border-0 fw-medium text-muted small">Customer since</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 fw-medium">{c.name}</td>
                  <td className="py-3 text-muted">{c.email}</td>
                  <td className="py-3">
                    <span
                      className={`badge fw-medium px-2 py-1 ${
                        c.status === 'Active'
                          ? 'bg-success bg-opacity-10 text-success'
                          : 'bg-secondary bg-opacity-10 text-secondary'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted">{c.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
