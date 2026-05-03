import { PageContainer } from "@components/layout/PageContainer/PageContainer";
import { PageSection } from "@components/layout/PageSection/PageSection";
import { Button } from "@components/ui/Button/Button";
import "./HomePage.scss";

export const HomePage = () => {
  return (
    <PageSection className="home-page">
      <PageContainer>
        <div className="home-page__content">
          <div className="home-page__text">
            <p className="home-page__eyebrow">ניהול שוטף</p>
            <h1 className="home-page__title">לוח ניהול מרכזי</h1>
            <p className="home-page__subtitle">
              סביבת עבודה ממוקדת לניהול יעיל וברור של הפעילות.
            </p>
          </div>
          <div className="home-page__actions">
            <Button>צור פרוייקט</Button>
          </div>
        </div>
      </PageContainer>
    </PageSection>
  );
};
