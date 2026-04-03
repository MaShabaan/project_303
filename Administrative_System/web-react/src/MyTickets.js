import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebaseConfig';
import './MyTickets.css';

function MyTickets({ onBack }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Reference your existing 'tickets' collection
    const ticketsRef = collection(db, 'tickets');
    
    // 2. Query for tickets belonging ONLY to this student
    const q = query(
      ticketsRef, 
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc') // Shows newest tickets first
    );

    // 3. Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTickets(ticketsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="my-tickets-page">
      <div className="background-overlay"></div>
      <div className="dashboard-container" style={{maxWidth: '1000px'}}>
        <h1>My Support Tickets</h1>
        <button className="back-link" onClick={onBack} style={{border: 'none', background: 'none', color: '#667eea', cursor: 'pointer', marginBottom: '20px'}}>
          &larr; Back to Dashboard
        </button>

        {loading ? (
          <div className="loading-text">Loading your tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="no-data">You haven't submitted any tickets yet.</div>
        ) : (
          <div className="tickets-list">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td>{ticket.category}</td>
                    <td>{ticket.subject}</td>
                    <td>
                      <span className={`status-badge ${ticket.status}`}>
                        {ticket.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>{ticket.createdAt?.toDate().toLocaleDateString() || 'Pending...'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTickets;