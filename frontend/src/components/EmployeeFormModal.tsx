'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import BaseModal from './modals/BaseModal';

interface EmployeeFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    hireDate: string;
    salary: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    emergencyContact: {
        name: string;
        relationship: string;
        phone: string;
    };
}

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (employee: any) => void;
    employee?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        position: string;
        department: string;
        hireDate: string;
        salary: number;
        address: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
        };
        emergencyContact: {
            name: string;
            relationship: string;
            phone: string;
        };
    } | null;
}

export default function EmployeeFormModal({ isOpen, onClose, onSuccess, employee }: EmployeeFormModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const isEditMode = !!employee;

    const defaultValues: EmployeeFormData = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        hireDate: '',
        salary: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'USA',
        },
        emergencyContact: {
            name: '',
            relationship: '',
            phone: '',
        },
    };

    const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeFormData>({
        defaultValues,
    });

    useEffect(() => {
        if (isOpen) {
            if (employee) {
                // Format the date to YYYY-MM-DD for the input
                const formattedHireDate = employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '';
                
                reset({
                    ...employee,
                    hireDate: formattedHireDate,
                    salary: employee.salary.toString(),
                });
            } else {
                reset(defaultValues);
            }
        }
    }, [isOpen, employee, reset]);

    const onSubmit = async (data: EmployeeFormData) => {
        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const endpoint = isEditMode ? `${apiUrl}/api/employees/${employee?._id}` : `${apiUrl}/api/employees`;
            const method = isEditMode ? 'PUT' : 'POST';

            // Convert salary to number
            const formattedData = {
                ...data,
                salary: parseFloat(data.salary),
            };

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formattedData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save employee');
            }

            const savedEmployee = await response.json();
            toast.success(`Employee ${isEditMode ? 'updated' : 'created'} successfully!`);
            
            if (onSuccess) {
                onSuccess(savedEmployee);
            }
            
            onClose();
        } catch (error) {
            console.error('Error saving employee:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while saving the employee');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? `Edit Employee: ${employee?.firstName} ${employee?.lastName}` : 'Add New Employee'}
            maxWidth="3xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                                        First Name
                                                    </label>
                        <div className="mt-1">
                                                    <input
                                                        type="text"
                                                        id="firstName"
                                {...register('firstName', { required: 'First name is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.firstName && (
                                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                            )}
                        </div>
                                                </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                                        Last Name
                                                    </label>
                        <div className="mt-1">
                                                    <input
                                                        type="text"
                                                        id="lastName"
                                {...register('lastName', { required: 'Last name is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.lastName && (
                                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                            )}
                                                </div>
                                            </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                                        Email
                                                    </label>
                        <div className="mt-1">
                                                    <input
                                                        type="email"
                                                        id="email"
                                {...register('email', { 
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: 'Invalid email address',
                                    }
                                })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                            )}
                        </div>
                                                </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                                        Phone
                                                    </label>
                        <div className="mt-1">
                                                    <input
                                                        type="tel"
                                                        id="phone"
                                {...register('phone', { required: 'Phone number is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.phone && (
                                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                            )}
                                                </div>
                                            </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                                                        Position
                                                    </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                                        id="position"
                                {...register('position', { required: 'Position is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.position && (
                                <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
                            )}
                        </div>
                                                </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                            Department
                                                    </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="department"
                                {...register('department', { required: 'Department is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.department && (
                                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
                            )}
                                                </div>
                                            </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700">
                                                        Hire Date
                                                    </label>
                        <div className="mt-1">
                                                    <input
                                                        type="date"
                                                        id="hireDate"
                                {...register('hireDate', { required: 'Hire date is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.hireDate && (
                                <p className="mt-1 text-sm text-red-600">{errors.hireDate.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                            Salary
                        </label>
                        <div className="mt-1">
                            <input
                                type="number"
                                id="salary"
                                step="0.01"
                                min="0"
                                {...register('salary', { 
                                    required: 'Salary is required',
                                    min: {
                                        value: 0,
                                        message: 'Salary must be a positive number',
                                    }
                                })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.salary && (
                                <p className="mt-1 text-sm text-red-600">{errors.salary.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Address</h3>
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                            Street Address
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="street"
                                {...register('address.street', { required: 'Street address is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.address?.street && (
                                <p className="mt-1 text-sm text-red-600">{errors.address.street.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                            City
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="city"
                                {...register('address.city', { required: 'City is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.address?.city && (
                                <p className="mt-1 text-sm text-red-600">{errors.address.city.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                            State
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="state"
                                {...register('address.state', { required: 'State is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.address?.state && (
                                <p className="mt-1 text-sm text-red-600">{errors.address.state.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                            ZIP / Postal Code
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="zipCode"
                                {...register('address.zipCode', { required: 'ZIP code is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.address?.zipCode && (
                                <p className="mt-1 text-sm text-red-600">{errors.address.zipCode.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Emergency Contact</h3>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="emergencyName" className="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="emergencyName"
                                {...register('emergencyContact.name', { required: 'Emergency contact name is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.emergencyContact?.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.emergencyContact.name.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="emergencyRelationship" className="block text-sm font-medium text-gray-700">
                            Relationship
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="emergencyRelationship"
                                {...register('emergencyContact.relationship', { required: 'Relationship is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.emergencyContact?.relationship && (
                                <p className="mt-1 text-sm text-red-600">{errors.emergencyContact.relationship.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700">
                            Phone
                        </label>
                        <div className="mt-1">
                            <input
                                type="tel"
                                id="emergencyPhone"
                                {...register('emergencyContact.phone', { required: 'Emergency contact phone is required' })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            {errors.emergencyContact?.phone && (
                                <p className="mt-1 text-sm text-red-600">{errors.emergencyContact.phone.message}</p>
                            )}
                        </div>
                                                </div>
                                            </div>

                <div className="flex justify-end space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                        disabled={isLoading}
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                                >
                        {isLoading ? 'Saving...' : isEditMode ? 'Update Employee' : 'Create Employee'}
                                                </button>
                                            </div>
                                        </form>
        </BaseModal>
    );
} 