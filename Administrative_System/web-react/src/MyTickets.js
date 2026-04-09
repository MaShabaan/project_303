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

    const q = query(
      collection(db, 'tickets'), 
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTickets(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="my-tickets-page">
      <div className="tickets-wide-container">
        <div className="tickets-header">
          <h1>My Support History</h1>
          <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
        </div>

        {loading ? (
          <div className="empty-state">Loading your tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">No tickets found. Submit one if you need help!</div>
        ) : (
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Date Submitted</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id}>
                  <td><strong>{ticket.category}</strong></td>
                  <td>{ticket.subject}</td>
                  <td>
                    <span className={`status-tag ${ticket.status}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>
                    {ticket.createdAt ? ticket.createdAt.toDate().toLocaleDateString() : 'Processing...'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default MyTickets;