import { Navigate, Route, Routes } from 'react-router-dom';

import { ProjectPage } from '../pages/ProjectPage';

const App = () => {
  return (
    <Routes>
      <Route path="/projects/:id" element={<ProjectPage />} />
      <Route path="*" element={<Navigate to="/projects/demo" replace />} />
    </Routes>
  );
};

export default App;
