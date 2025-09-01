--
-- PostgreSQL database dump
--

\restrict W4wKZSlzWtK9cnh5xNGQOA4giwxpX9I37aa7Yof98NvjRebswCYYe1BROKf8Rj3

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
-- Name: project_allocations; Type: TABLE; Schema: public; Owner: malikadeel
--

CREATE TABLE public.project_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    work_item_id uuid,
    start_date date NOT NULL,
    end_date date NOT NULL,
    allocation_percentage integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT project_allocations_allocation_percentage_check CHECK (((allocation_percentage >= 1) AND (allocation_percentage <= 100))),
    CONSTRAINT valid_date_range CHECK ((start_date <= end_date))
);


ALTER TABLE public.project_allocations OWNER TO malikadeel;

--
-- Data for Name: project_allocations; Type: TABLE DATA; Schema: public; Owner: malikadeel
--

COPY public.project_allocations (id, organization_id, user_id, project_id, work_item_id, start_date, end_date, allocation_percentage, created_at, updated_at) FROM stdin;
330a6f46-b249-42f8-ab5e-68fa54f1570e	05f931a0-0319-465d-8084-c38be7519012	f4e81703-475f-433e-b67e-99e87308e95c	d7489226-0c1d-4960-9876-67c401150a9b	\N	2025-01-05	2025-01-09	50	2025-08-28 07:24:34.228921	2025-08-28 07:24:34.228921
67cd639d-5828-40a0-bb5b-00361f114283	05f931a0-0319-465d-8084-c38be7519012	f4e81703-475f-433e-b67e-99e87308e95c	d7489226-0c1d-4960-9876-67c401150a9b	\N	2025-01-05	2025-01-09	50	2025-08-28 08:32:36.672219	2025-08-28 08:32:36.672219
a4dccc18-2cc4-4770-8ee1-760103774db2	a388291a-1c7f-4055-aa01-f5b679589910	efe5b9eb-9746-47c9-ae02-0a8ac9330805	11111111-1111-1111-1111-111111111111	\N	2023-12-31	2024-01-30	80	2025-08-28 09:31:51.483391	2025-08-28 09:31:51.483391
\.


--
-- Name: project_allocations project_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: malikadeel
--

ALTER TABLE ONLY public.project_allocations
    ADD CONSTRAINT project_allocations_pkey PRIMARY KEY (id);


--
-- Name: idx_proj_alloc_org_user_dates; Type: INDEX; Schema: public; Owner: malikadeel
--

CREATE INDEX idx_proj_alloc_org_user_dates ON public.project_allocations USING btree (organization_id, user_id, start_date, end_date);


--
-- Name: idx_proj_alloc_project; Type: INDEX; Schema: public; Owner: malikadeel
--

CREATE INDEX idx_proj_alloc_project ON public.project_allocations USING btree (project_id);


--
-- Name: project_allocations project_allocations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: malikadeel
--

ALTER TABLE ONLY public.project_allocations
    ADD CONSTRAINT project_allocations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_allocations project_allocations_work_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: malikadeel
--

ALTER TABLE ONLY public.project_allocations
    ADD CONSTRAINT project_allocations_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES public."workItems"(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict W4wKZSlzWtK9cnh5xNGQOA4giwxpX9I37aa7Yof98NvjRebswCYYe1BROKf8Rj3

