--
-- PostgreSQL database dump
--

\restrict Lw2Ms3g9xDQr11bQS9pjrbjgsMBHXgSYS2Dbh8uxJbh5KGHB9J8apyArXDWEEy8

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: resource_allocations; Type: TABLE; Schema: public; Owner: malikadeel
--

CREATE TABLE public.resource_allocations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "resourceId" uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "taskId" uuid,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    "allocationPercentage" numeric(5,2) NOT NULL,
    "hoursPerDay" integer DEFAULT 8 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    work_item_id uuid,
    "workItemId" uuid,
    "organizationId" uuid,
    "userId" uuid,
    CONSTRAINT check_allocation_percentage CHECK ((("allocationPercentage" > (0)::numeric) AND ("allocationPercentage" <= (100)::numeric))),
    CONSTRAINT check_date_range CHECK (("startDate" <= "endDate")),
    CONSTRAINT check_reasonable_date CHECK (("endDate" <= (CURRENT_DATE + '2 years'::interval)))
);


ALTER TABLE public.resource_allocations OWNER TO malikadeel;

--
-- Data for Name: resource_allocations; Type: TABLE DATA; Schema: public; Owner: malikadeel
--

COPY public.resource_allocations (id, "resourceId", "projectId", "taskId", "startDate", "endDate", "allocationPercentage", "hoursPerDay", "createdAt", work_item_id, "workItemId", "organizationId", "userId") FROM stdin;
f21a5f83-fbf7-4f6b-acdc-c35509714074	a133e51a-044e-4b05-bbb6-944718201e06	11111111-1111-1111-1111-111111111111	\N	2025-09-01	2025-09-15	80.00	8	2025-08-27 08:03:11.621681	\N	\N	\N	a133e51a-044e-4b05-bbb6-944718201e06
80cb0ce7-91aa-47b3-9e0e-d6b634043928	a133e51a-044e-4b05-bbb6-944718201e06	11111111-1111-1111-1111-111111111111	\N	2025-09-10	2025-09-20	60.00	8	2025-08-27 08:03:11.621681	\N	\N	\N	a133e51a-044e-4b05-bbb6-944718201e06
\.


--
-- Name: resource_allocations PK_resource_allocations; Type: CONSTRAINT; Schema: public; Owner: malikadeel
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT "PK_resource_allocations" PRIMARY KEY (id);


--
-- Name: IDX_resource_allocations_project; Type: INDEX; Schema: public; Owner: malikadeel
--

CREATE INDEX "IDX_resource_allocations_project" ON public.resource_allocations USING btree ("projectId");


--
-- Name: IDX_resource_allocations_resource_date; Type: INDEX; Schema: public; Owner: malikadeel
--

CREATE INDEX "IDX_resource_allocations_resource_date" ON public.resource_allocations USING btree ("resourceId", "startDate", "endDate");


--
-- Name: idx_allocations_org_user_dates; Type: INDEX; Schema: public; Owner: malikadeel
--

CREATE INDEX idx_allocations_org_user_dates ON public.resource_allocations USING btree ("resourceId", "userId", "startDate", "endDate");


--
-- Name: idx_allocations_project; Type: INDEX; Schema: public; Owner: malikadeel
--

CREATE INDEX idx_allocations_project ON public.resource_allocations USING btree ("projectId");


--
-- Name: idx_resource_allocations_dates; Type: INDEX; Schema: public; Owner: malikadeel
--

CREATE INDEX idx_resource_allocations_dates ON public.resource_allocations USING btree ("resourceId", "startDate", "endDate");


--
-- Name: resource_allocations fk_allocation_project; Type: FK CONSTRAINT; Schema: public; Owner: malikadeel
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT fk_allocation_project FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: resource_allocations fk_resource_user; Type: FK CONSTRAINT; Schema: public; Owner: malikadeel
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT fk_resource_user FOREIGN KEY ("resourceId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resource_allocations resource_allocations_workItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: malikadeel
--

ALTER TABLE ONLY public.resource_allocations
    ADD CONSTRAINT "resource_allocations_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES public."workItems"(id) ON DELETE SET NULL;


--
-- Name: resource_allocations; Type: ROW SECURITY; Schema: public; Owner: malikadeel
--

ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: resource_allocations tenant_isolation_allocations; Type: POLICY; Schema: public; Owner: malikadeel
--

CREATE POLICY tenant_isolation_allocations ON public.resource_allocations USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = resource_allocations."projectId") AND (p.organization_id =
        CASE
            WHEN (current_setting('app.current_org_id'::text, true) = ''::text) THEN p.organization_id
            ELSE (current_setting('app.current_org_id'::text, true))::uuid
        END)))));


--
-- PostgreSQL database dump complete
--

\unrestrict Lw2Ms3g9xDQr11bQS9pjrbjgsMBHXgSYS2Dbh8uxJbh5KGHB9J8apyArXDWEEy8

