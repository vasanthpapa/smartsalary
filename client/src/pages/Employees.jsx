import React, { useState } from 'react';
import { useWorkforce, DAYSHORT } from '../context/workforceShared';
import { Edit2, Trash2, PlusCircle, X } from 'lucide-react';

const Employees = () => {
    const { employees, saveEmployees } = useWorkforce();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        role: '',
        dept: '',
        salary: '',
        checkin: '09:00',
        weekoffs: []
    });

    const toggleAddEmp = () => {
        setEditingEmp(null);
        setFormData({
            id: '',
            name: '',
            role: '',
            dept: '',
            salary: '',
            checkin: '09:00',
            weekoffs: []
        });
        setIsFormOpen(!isFormOpen);
    };

    const handleEdit = (emp) => {
        setEditingEmp(emp.id);
        setFormData({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            dept: emp.dept,
            salary: emp.salary,
            checkin: emp.checkin || '09:00',
            weekoffs: emp.weekoffs || []
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this employee?")) return;
        const newEmployees = employees.filter(e => e.id !== id);
        try {
            setSaving(true);
            await saveEmployees(newEmployees);
        } catch (error) {
            console.error('Delete employee failed:', error);
            alert(error?.response?.data?.error || 'Unable to delete employee. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const toggleWeekoff = (dayIdx) => {
        setFormData(prev => ({
            ...prev,
            weekoffs: prev.weekoffs.includes(dayIdx) 
                ? prev.weekoffs.filter(d => d !== dayIdx) 
                : [...prev.weekoffs, dayIdx]
        }));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.salary) {
            alert("Name and Salary are required!");
            return;
        }

        let newEmployees;
        if (editingEmp) {
            newEmployees = employees.map(e => e.id === editingEmp ? { ...formData } : e);
        } else {
            const newEmp = { ...formData, id: 'E' + Date.now() };
            newEmployees = [...employees, newEmp];
        }

        try {
            setSaving(true);
            await saveEmployees(newEmployees);
            setIsFormOpen(false);
        } catch (error) {
            console.error('Save employee failed:', error);
            alert(error?.response?.data?.error || 'Unable to save employee. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pg active">
            <div className="card">
                <div className="ch">
                    <span className="ct">Employee List</span>
                    <button className="primary-btn small-btn" style={{ width: 'auto' }} onClick={toggleAddEmp}>
                        <PlusCircle size={16} style={{ marginRight: '6px' }} />
                        Add Employee
                    </button>
                </div>

                {isFormOpen && (
                    <div className="card" style={{ background: 'var(--input-bg)', marginBottom: '1.5rem', animation: 'slideUpFade 0.3s forwards' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ color: 'var(--text-primary)' }}>{editingEmp ? 'Edit Employee' : 'Add New Employee'}</h4>
                            <button className="btn-icon" onClick={() => setIsFormOpen(false)}><X size={18} /></button>
                        </div>
                        
                        <div className="input-grid form-grid">
                            <div className="input-group">
                                <label>Full Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
                            </div>
                            <div className="input-group">
                                <label>Role</label>
                                <input type="text" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} placeholder="Software Engineer" />
                            </div>
                            <div className="input-group">
                                <label>Department</label>
                                <input type="text" value={formData.dept} onChange={(e) => setFormData({...formData, dept: e.target.value})} placeholder="Engineering" />
                            </div>
                            <div className="input-group">
                                <label>Basic Salary (₹/month)</label>
                                <input type="number" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} placeholder="30000.50" step="0.01" />
                            </div>
                            <div className="input-group">
                                <label>Standard Check-in Time</label>
                                <input type="time" value={formData.checkin} onChange={(e) => setFormData({...formData, checkin: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>Week-off Days</label>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                    {DAYSHORT.map((day, idx) => (
                                        <span 
                                            key={idx} 
                                            className={`day-btn ${formData.weekoffs.includes(idx) ? 'selected' : ''}`}
                                            onClick={() => toggleWeekoff(idx)}
                                        >
                                            {day}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                            <button className="primary-btn small-btn" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Employee'}
                            </button>
                            <button className="secondary-btn small-btn" onClick={() => setIsFormOpen(false)} disabled={saving}>Cancel</button>
                        </div>
                    </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Dept</th>
                                <th>Basic</th>
                                <th>Check-in</th>
                                <th>Week-offs</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="av">{emp.name[0]}</div>
                                            <span>{emp.name}</span>
                                        </div>
                                    </td>
                                    <td>{emp.role}</td>
                                    <td>{emp.dept}</td>
                                    <td>₹{parseFloat(emp.salary).toLocaleString()}</td>
                                    <td>{emp.checkin}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            {emp.weekoffs?.map(w => (
                                                <span key={w} style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '1px 4px', borderRadius: '4px' }}>{DAYSHORT[w]}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn-icon" onClick={() => handleEdit(emp)}><Edit2 size={16} /></button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(emp.id)} disabled={saving}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Employees;
