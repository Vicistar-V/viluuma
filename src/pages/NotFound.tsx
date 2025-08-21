import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    // Immediately redirect to home instead of showing 404 page
    navigate('/', { replace: true });
  }, [location.pathname, navigate]);

  // This component will never actually render due to immediate redirect
  return null;
};

export default NotFound;
