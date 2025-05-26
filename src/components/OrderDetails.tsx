import React from 'react';
import { useParams } from 'react-router-dom';

const OrderDetails = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Order Details</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Order ID: {id}</p>
        {/* Additional order details will be implemented later */}
        <p className="text-gray-500 mt-4">Order details are being loaded...</p>
      </div>
    </div>
  );
};

export default OrderDetails;